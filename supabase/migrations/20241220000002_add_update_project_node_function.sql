-- Função para atualizar um nó específico do projeto com uma nova imagem
CREATE OR REPLACE FUNCTION update_project_node_image(
    project_id UUID,
    node_id TEXT,
    image_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE projects
    SET 
        nodes = jsonb_set(
            nodes,
            ARRAY[node_id, 'data', 'outputs', 'image'],
            to_jsonb(image_url)
        ),
        updated_at = NOW()
    WHERE id = project_id;
END;
$$;