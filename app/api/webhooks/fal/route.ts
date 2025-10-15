import { env } from '@/lib/env';
import { parseError } from '@/lib/error/parse';
import { database } from '@/lib/database';
import { falJobs } from '@/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

type FalWebhookPayload = {
    request_id: string;
    status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'OK';
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

            // Fazer upload para Supabase Storage (imagens e vídeos)
            // Usar createClient do supabase-js diretamente com service role key
            const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
            const client = createSupabaseClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role bypassa RLS
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                    },
                }
            );

            if (job.type === 'image' && result.images?.[0]?.url) {
                console.log('Uploading image to Supabase Storage...');

                try {
                    const imageUrl = result.images[0].url;

                    // Baixar imagem do fal.ai
                    console.log('Fetching image from fal.ai:', imageUrl);
                    const imageResponse = await fetch(imageUrl);

                    if (!imageResponse.ok) {
                        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
                    }

                    // Obter como Blob (melhor para upload)
                    const imageBlob = await imageResponse.blob();
                    console.log('Image downloaded, size:', imageBlob.size, 'bytes');

                    // Upload para Supabase
                    const fileName = `${job.userId}/${nanoid()}.png`;
                    console.log('Uploading to Supabase:', fileName);

                    const { data: uploadData, error: uploadError } = await client.storage
                        .from('files')
                        .upload(fileName, imageBlob, {
                            contentType: 'image/png',
                            upsert: false,
                        });

                    if (uploadError) {
                        console.error('Upload error:', uploadError);
                        throw uploadError;
                    }

                    // Obter URL pública
                    const { data: publicUrlData } = client.storage
                        .from('files')
                        .getPublicUrl(uploadData.path);

                    // Atualizar resultado com URL do Supabase
                    result.images[0].url = publicUrlData.publicUrl;

                    console.log('Image uploaded to Supabase:', publicUrlData.publicUrl);
                } catch (uploadError) {
                    console.error('Failed to upload image to Supabase:', uploadError);
                    // Continuar mesmo se upload falhar (usar URL temporária do fal.ai)
                }
            } else if (job.type === 'video' && result.video?.url) {
                console.log('Uploading video to Supabase Storage...');

                try {
                    const videoUrl = result.video.url;

                    // Baixar vídeo do fal.ai
                    console.log('Fetching video from fal.ai:', videoUrl);
                    const videoResponse = await fetch(videoUrl);

                    if (!videoResponse.ok) {
                        throw new Error(`Failed to fetch video: ${videoResponse.status}`);
                    }

                    // Obter como Blob (melhor para upload)
                    const videoBlob = await videoResponse.blob();
                    console.log('Video downloaded, size:', videoBlob.size, 'bytes');

                    // Upload para Supabase
                    const fileName = `${job.userId}/${nanoid()}.mp4`;
                    console.log('Uploading to Supabase:', fileName);

                    const { data: uploadData, error: uploadError } = await client.storage
                        .from('files')
                        .upload(fileName, videoBlob, {
                            contentType: 'video/mp4',
                            upsert: false,
                        });

                    if (uploadError) {
                        console.error('Upload error:', uploadError);
                        throw uploadError;
                    }

                    // Obter URL pública
                    const { data: publicUrlData } = client.storage
                        .from('files')
                        .getPublicUrl(uploadData.path);

                    // Atualizar resultado com URL do Supabase
                    result.video.url = publicUrlData.publicUrl;

                    console.log('Video uploaded to Supabase:', publicUrlData.publicUrl);
                } catch (uploadError) {
                    console.error('Failed to upload video to Supabase:', uploadError);
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

                if (nodeId && projectId) {
                    console.log('Updating project node with permanent URL...');

                    const { projects } = await import('@/schema');
                    const project = await database.query.projects.findFirst({
                        where: eq(projects.id, projectId),
                    });

                    if (project) {
                        const content = project.content as {
                            nodes: any[];
                            edges: any[];
                            viewport: any;
                        };

                        // Encontrar e atualizar o nó
                        const updatedNodes = content.nodes.map((node: any) => {
                            if (node.id === nodeId) {
                                const imageUrl = job.type === 'image'
                                    ? result.images?.[0]?.url
                                    : result.video?.url;

                                return {
                                    ...node,
                                    data: {
                                        ...node.data,
                                        generated: {
                                            url: imageUrl,
                                            type: job.type === 'image' ? 'image/png' : 'video/mp4',
                                        },
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
                            })
                            .where(eq(projects.id, projectId));

                        console.log('Project node updated successfully');
                    }
                }
            } catch (projectUpdateError) {
                console.error('Failed to update project:', projectUpdateError);
                // Não falhar o webhook se atualização do project falhar
            }
        } else if (payload.status === 'FAILED') {
            await database
                .update(falJobs)
                .set({
                    status: 'failed',
                    error: payload.error || 'Unknown error',
                    completedAt: new Date(),
                })
                .where(eq(falJobs.requestId, payload.request_id));

            console.error('Job failed:', payload.request_id, payload.error);
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
