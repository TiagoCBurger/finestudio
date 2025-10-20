import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/database';
import { falJobs } from '@/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log('🔔 Kie.ai webhook received:', {
            hasBody: !!body,
            bodyKeys: Object.keys(body || {}),
            fullBody: JSON.stringify(body, null, 2),
        });

        // Extrair dados do webhook do Kie.ai
        const requestId = body.taskId || body.recordId || body.id;
        const { status, result, error } = body;

        if (!requestId) {
            console.error('❌ Kie.ai webhook: Missing request ID');
            return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });
        }

        console.log('🔍 Processing Kie.ai webhook:', {
            requestId,
            status,
            hasResult: !!result,
            hasError: !!error,
        });

        // Buscar o job no banco de dados
        const [job] = await database
            .select()
            .from(falJobs)
            .where(eq(falJobs.requestId, requestId))
            .limit(1);

        if (!job) {
            console.error('❌ Kie.ai webhook: Job not found for request ID:', requestId);
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        console.log('✅ Found job:', {
            jobId: job.id,
            userId: job.userId,
            modelId: job.modelId,
            currentStatus: job.status,
        });

        // Atualizar status do job baseado no webhook
        let newStatus: 'pending' | 'completed' | 'failed';
        let jobResult = null;
        let jobError = null;

        if (status === 'completed' && result) {
            newStatus = 'completed';
            jobResult = result;
            console.log('✅ Job completed successfully');
        } else if (status === 'failed' || error) {
            newStatus = 'failed';
            jobError = error || 'Unknown error from Kie.ai';
            console.log('❌ Job failed:', jobError);
        } else {
            // Status ainda pendente ou desconhecido - não atualizar o banco ainda
            console.log('⏳ Job still pending or unknown status:', status);
            return NextResponse.json({ message: 'Status received but not final' });
        }

        // Atualizar o job no banco
        await database
            .update(falJobs)
            .set({
                status: newStatus,
                result: jobResult,
                error: jobError,
                completedAt: (newStatus === 'completed' || newStatus === 'failed') ? new Date() : null,
            })
            .where(eq(falJobs.id, job.id));

        console.log('✅ Job updated in database');

        // Se o job foi completado com sucesso, processar o resultado
        if (newStatus === 'completed' && jobResult && job.input) {
            try {
                const input = job.input as any;
                const metadata = input._metadata;

                if (metadata?.projectId && metadata?.nodeId) {
                    console.log('🔄 Processing project update:', {
                        projectId: metadata.projectId,
                        nodeId: metadata.nodeId,
                    });

                    // Extrair URL da imagem do resultado
                    let imageUrl = null;
                    if (jobResult.images && Array.isArray(jobResult.images) && jobResult.images.length > 0) {
                        imageUrl = jobResult.images[0].url;
                    }

                    if (imageUrl) {
                        // Buscar o projeto atual
                        const { data: project, error: fetchError } = await supabase
                            .from('projects')
                            .select('nodes')
                            .eq('id', metadata.projectId)
                            .single();

                        if (fetchError || !project) {
                            console.error('❌ Error fetching project:', fetchError);
                            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
                        }

                        // Atualizar o nó com a nova imagem
                        const updatedNodes = { ...project.nodes };
                        if (updatedNodes[metadata.nodeId]?.data?.outputs) {
                            updatedNodes[metadata.nodeId].data.outputs.image = imageUrl;
                        }

                        // Salvar as mudanças
                        const { error: updateError } = await supabase
                            .from('projects')
                            .update({
                                nodes: updatedNodes,
                                updated_at: new Date().toISOString(),
                            })
                            .eq('id', metadata.projectId);

                        if (updateError) {
                            console.error('❌ Error updating project:', updateError);
                        } else {
                            console.log('✅ Project updated successfully');

                            // Broadcast da mudança via Supabase Realtime
                            await supabase
                                .channel(`project:${metadata.projectId}`)
                                .send({
                                    type: 'broadcast',
                                    event: 'project_updated',
                                    payload: {
                                        projectId: metadata.projectId,
                                        nodeId: metadata.nodeId,
                                        imageUrl,
                                        provider: 'kie',
                                        modelId: job.modelId,
                                    },
                                });

                            console.log('✅ Update broadcasted successfully');
                        }
                    }
                }
            } catch (processingError) {
                console.error('❌ Error processing job result:', processingError);
            }
        }

        return NextResponse.json({
            message: 'Webhook processed successfully',
            status: newStatus,
        });

    } catch (error) {
        console.error('❌ Kie.ai webhook error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}