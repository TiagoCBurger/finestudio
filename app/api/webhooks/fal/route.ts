import { parseError } from '@/lib/error/parse';
import { database } from '@/lib/database';
import { falJobs } from '@/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getStorageProvider } from '@/lib/storage/factory';

type FalWebhookPayload = {
    request_id: string;
    status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'OK' | 'ERROR';
    response_url?: string;
    error?: string;
    logs?: Array<{ message: string; level: string; timestamp: string }>;
    // O resultado pode vir diretamente no webhook
    images?: Array<{ url: string }>;
    video?: { url: string };
    [key: string]: any; // Para outros campos que possam vir
};

export const POST = async (req: Request) => {
    try {
        const payload: FalWebhookPayload = await req.json();

        console.log('Fal.ai webhook received:', {
            request_id: payload.request_id,
            status: payload.status,
            has_response_url: !!payload.response_url,
            has_error: !!payload.error,
            error: payload.error,
            errorDetail: (payload as any).payload?.detail, // Ver detalhes do erro 422
            full_payload: payload, // Debug: ver payload completo
        });

        // Log detalhado do erro 422
        if (payload.status === 'ERROR' && payload.error?.includes('422')) {
            const detail = (payload as any).payload?.detail;
            console.log('🔴 Erro 422 - Detalhes completos:', JSON.stringify(detail, null, 2));
            if (Array.isArray(detail)) {
                detail.forEach((err, idx) => {
                    console.log(`  Erro ${idx + 1}:`, {
                        field: err.loc?.join('.'),
                        message: err.msg,
                        type: err.type,
                        input: err.input,
                    });
                });
            }
        }

        // Buscar o job no banco de dados
        const [job] = await database
            .select()
            .from(falJobs)
            .where(eq(falJobs.requestId, payload.request_id))
            .limit(1);

        if (!job) {
            console.warn('Job não encontrado:', payload.request_id);
            return NextResponse.json(
                { error: 'Job not found' },
                { status: 404 }
            );
        }

        // Atualizar status baseado no webhook
        if (payload.status === 'ERROR' || payload.status === 'FAILED') {
            // Lidar com erro primeiro
            const errorMessage = payload.error || 'Unknown error';
            const errorDetail = (payload as any).payload?.detail;

            console.error('❌ Fal.ai job failed:', {
                request_id: payload.request_id,
                error: errorMessage,
                detail: errorDetail,
            });

            await database
                .update(falJobs)
                .set({
                    status: 'failed',
                    error: `${errorMessage}${errorDetail ? ` - ${JSON.stringify(errorDetail)}` : ''}`,
                    completedAt: new Date(),
                })
                .where(eq(falJobs.requestId, payload.request_id));

            return NextResponse.json({ success: true }, { status: 200 });
        }

        if (payload.status === 'COMPLETED' || payload.status === 'OK') {
            let result;

            if (payload.response_url) {
                // Buscar o resultado via URL
                const resultResponse = await fetch(payload.response_url);
                result = await resultResponse.json();
            } else {
                // Resultado veio diretamente no webhook
                // O fal.ai envia o resultado em payload.payload
                const payloadData = (payload as any).payload;

                result = {
                    images: payloadData?.images || payload.images,
                    video: payloadData?.video || payload.video,
                    // Copiar outros campos relevantes
                    ...Object.fromEntries(
                        Object.entries(payload).filter(([key]) =>
                            !['request_id', 'status', 'error', 'logs', 'payload', 'gateway_request_id'].includes(key)
                        )
                    )
                };

                console.log('Extracted result from webhook:', {
                    hasImages: !!result.images,
                    hasVideo: !!result.video,
                    imageCount: result.images?.length,
                    firstImageUrl: result.images?.[0]?.url?.substring(0, 50),
                });
            }

            // Fazer upload para storage (imagens e vídeos)
            // Usar a abstração de storage que suporta R2 e Supabase
            const storage = getStorageProvider();

            if (job.type === 'image' && result.images?.[0]?.url) {
                console.log('Uploading image to R2 storage...');

                try {
                    const imageUrl = result.images[0].url;

                    // Baixar imagem do fal.ai
                    console.log('Fetching image from fal.ai:', imageUrl);
                    const imageResponse = await fetch(imageUrl);

                    if (!imageResponse.ok) {
                        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
                    }

                    // Obter como Buffer
                    const imageArrayBuffer = await imageResponse.arrayBuffer();
                    const imageBuffer = Buffer.from(imageArrayBuffer);
                    console.log('Image downloaded, size:', imageBuffer.length, 'bytes');

                    // Upload usando a abstração de storage
                    const fileName = `${nanoid()}.png`;
                    console.log('Uploading to storage:', fileName);

                    const uploadResult = await storage.upload(
                        job.userId,
                        'files',
                        fileName,
                        imageBuffer,
                        {
                            contentType: 'image/png',
                            upsert: false,
                        }
                    );

                    // Atualizar resultado com URL permanente
                    result.images[0].url = uploadResult.url;

                    console.log('Image uploaded to storage:', uploadResult.url);
                } catch (uploadError) {
                    console.error('Failed to upload image to storage:', uploadError);
                    // Continuar mesmo se upload falhar (usar URL temporária do fal.ai)
                }
            } else if (job.type === 'video' && result.video?.url) {
                console.log('Uploading video to R2 storage...');

                try {
                    const videoUrl = result.video.url;

                    // Baixar vídeo do fal.ai
                    console.log('Fetching video from fal.ai:', videoUrl);
                    const videoResponse = await fetch(videoUrl);

                    if (!videoResponse.ok) {
                        throw new Error(`Failed to fetch video: ${videoResponse.status}`);
                    }

                    // Obter como Buffer
                    const videoArrayBuffer = await videoResponse.arrayBuffer();
                    const videoBuffer = Buffer.from(videoArrayBuffer);
                    console.log('Video downloaded, size:', videoBuffer.length, 'bytes');

                    // Upload usando a abstração de storage
                    const fileName = `${nanoid()}.mp4`;
                    console.log('Uploading to storage:', fileName);

                    const uploadResult = await storage.upload(
                        job.userId,
                        'files',
                        fileName,
                        videoBuffer,
                        {
                            contentType: 'video/mp4',
                            upsert: false,
                        }
                    );

                    // Atualizar resultado com URL permanente
                    result.video.url = uploadResult.url;

                    console.log('Video uploaded to storage:', uploadResult.url);
                } catch (uploadError) {
                    console.error('Failed to upload video to storage:', uploadError);
                    // Continuar mesmo se upload falhar (usar URL temporária do fal.ai)
                }
            }

            // Atualizar job no banco
            await database
                .update(falJobs)
                .set({
                    status: 'completed',
                    result,
                    completedAt: new Date(),
                })
                .where(eq(falJobs.requestId, payload.request_id));

            console.log('Job completed:', payload.request_id, 'Result type:', payload.response_url ? 'URL' : 'Direct');

            // Atualizar o project no banco com a URL permanente
            // Isso garante que a imagem persista após reload da página
            try {
                const jobInput = job.input as any;
                const nodeId = jobInput?._metadata?.nodeId;
                const projectId = jobInput?._metadata?.projectId;

                console.log('🔍 Webhook project update metadata:', {
                    hasJobInput: !!jobInput,
                    nodeId,
                    projectId,
                    jobType: job.type,
                    hasResult: !!result
                });

                if (nodeId && projectId) {
                    console.log('📝 Updating project node with permanent URL...');

                    const { projects } = await import('@/schema');
                    const project = await database.query.projects.findFirst({
                        where: eq(projects.id, projectId),
                    });

                    if (!project) {
                        console.warn('⚠️ Project not found:', projectId);
                        console.warn('   Project may have been deleted');

                        // Marcar job como completed (não failed) para evitar toasts de erro
                        await database
                            .update(falJobs)
                            .set({
                                status: 'completed',
                                result: {
                                    ...result,
                                    _note: 'Project was deleted before webhook completed'
                                },
                                completedAt: new Date(),
                            })
                            .where(eq(falJobs.requestId, payload.request_id));

                        return NextResponse.json({ success: true }, { status: 200 });
                    }

                    console.log('📄 Project found, updating content...');

                    const content = project.content as {
                        nodes: any[];
                        edges: any[];
                        viewport: any;
                    };

                    // 🔧 VALIDAÇÃO MELHORADA: Verificar estrutura do content
                    if (!content || !Array.isArray(content.nodes)) {
                        console.error('❌ Invalid project content structure:', {
                            hasContent: !!content,
                            contentType: typeof content,
                            hasNodes: !!(content && content.nodes),
                            nodesType: content ? typeof content.nodes : 'N/A',
                            isNodesArray: content ? Array.isArray(content.nodes) : false
                        });

                        // Marcar job como completed (não failed) para evitar toasts de erro
                        await database
                            .update(falJobs)
                            .set({
                                status: 'completed',
                                result: {
                                    ...result,
                                    _note: 'Project content structure invalid'
                                },
                                completedAt: new Date(),
                            })
                            .where(eq(falJobs.requestId, payload.request_id));

                        return NextResponse.json({ success: true }, { status: 200 });
                    }

                    console.log('🔍 Current project content:', {
                        nodeCount: content.nodes.length,
                        hasTargetNode: content.nodes.some((n: any) => n.id === nodeId)
                    });

                    // 🔧 VALIDAÇÃO MELHORADA: Verificar se o nó existe antes de atualizar
                    const targetNode = content.nodes.find((n: any) => n.id === nodeId);
                    if (!targetNode) {
                        console.warn('⚠️ Target node not found in project:', {
                            nodeId,
                            projectId,
                            availableNodes: content.nodes.map((n: any) => ({ id: n.id, type: n.type }))
                        });
                        console.warn('   The node may have been deleted after the job was created');
                        console.warn('   Marking job as completed (silently) to avoid false error notifications');

                        // ✅ MELHORIA: Marcar como completed (não failed) para evitar toasts de erro
                        // O nó foi removido pelo usuário, não é um erro real
                        await database
                            .update(falJobs)
                            .set({
                                status: 'completed',
                                result: {
                                    ...result,
                                    _note: 'Node was deleted before webhook completed'
                                },
                                completedAt: new Date(),
                            })
                            .where(eq(falJobs.requestId, payload.request_id));

                        return NextResponse.json({ success: true }, { status: 200 });
                    }

                    // Encontrar e atualizar o nó
                    const updatedNodes = content.nodes.map((node: any) => {
                        if (node.id === nodeId) {
                            const mediaUrl = job.type === 'image'
                                ? result.images?.[0]?.url
                                : result.video?.url;

                            console.log('🎯 Updating target node:', {
                                nodeId: node.id,
                                nodeType: node.type,
                                hasResult: !!result,
                                hasImages: !!result.images,
                                hasVideo: !!result.video,
                                imageUrl: result.images?.[0]?.url,
                                videoUrl: result.video?.url,
                                oldUrl: node.data?.generated?.url,
                                newUrl: mediaUrl,
                                jobType: job.type
                            });

                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    generated: {
                                        url: mediaUrl,
                                        type: job.type === 'image' ? 'image/png' : 'video/mp4',
                                    },
                                    loading: false, // Remover flag de loading
                                    status: undefined, // Remover status pending
                                    requestId: undefined, // Remover requestId
                                    updatedAt: new Date().toISOString(),
                                },
                            };
                        }
                        return node;
                    });

                    // Salvar project atualizado
                    await database
                        .update(projects)
                        .set({
                            content: {
                                ...content,
                                nodes: updatedNodes,
                            },
                            updatedAt: new Date(), // Importante para trigger realtime
                        })
                        .where(eq(projects.id, projectId));

                    console.log('✅ Project node updated successfully, realtime should trigger now');
                } else {
                    console.warn('⚠️ Missing metadata for project update:', { nodeId, projectId });
                    console.warn('   Job input may be missing _metadata field');
                }
            } catch (projectUpdateError) {
                console.error('❌ Failed to update project:', projectUpdateError);

                // ✅ MELHORIA: Marcar como completed (não failed) para evitar toasts de erro
                // O job foi processado com sucesso, apenas a atualização do projeto falhou
                await database
                    .update(falJobs)
                    .set({
                        status: 'completed',
                        result: {
                            ...result,
                            _note: `Project update failed: ${projectUpdateError instanceof Error ? projectUpdateError.message : projectUpdateError}`
                        },
                        completedAt: new Date(),
                    })
                    .where(eq(falJobs.requestId, payload.request_id));

                // Não falhar o webhook, apenas logar
            }
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        const message = parseError(error);
        console.error('Webhook error:', message);

        return NextResponse.json(
            {
                error: {
                    http_code: 500,
                    message,
                },
            },
            { status: 500 }
        );
    }
};
