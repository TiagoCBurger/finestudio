'use client';

import { updateProjectAction } from '@/app/actions/project/update';
import { useAnalytics } from '@/hooks/use-analytics';
import { useSaveProject } from '@/hooks/use-save-project';
import { useUser } from '@/hooks/use-user';
import { handleError } from '@/lib/error/handle';
import { isValidSourceTarget } from '@/lib/xyflow';
import { NodeDropzoneProvider } from '@/providers/node-dropzone';
import { NodeOperationsProvider } from '@/providers/node-operations';
import { useProject } from '@/providers/project';
import {
  Background,
  type IsValidConnection,
  type OnConnect,
  type OnConnectEnd,
  type OnConnectStart,
  type OnEdgesChange,
  type OnNodesChange,
  ReactFlow,
  type ReactFlowProps,
  getOutgoers,
  useReactFlow,
} from '@xyflow/react';
import {
  type Edge,
  type Node,
  applyEdgeChanges,
  applyNodeChanges,
} from '@xyflow/react';
import { BoxSelectIcon, PlusIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { MouseEvent, MouseEventHandler, ClipboardEvent } from 'react';
import { useCallback, useState, useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDebouncedCallback } from 'use-debounce';
import { mutate } from 'swr';
import { uploadFile } from '@/lib/upload.client';
import { ConnectionLine } from './connection-line';
import { edgeTypes } from './edges';
import { nodeTypes } from './nodes';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from './ui/context-menu';
import { toast } from 'sonner';

export const Canvas = ({ children, ...props }: ReactFlowProps) => {
  const project = useProject();
  const { user } = useUser();
  const {
    onConnect,
    onConnectStart,
    onConnectEnd,
    onEdgesChange,
    onNodesChange,
    nodes: initialNodes,
    edges: initialEdges,
    ...rest
  } = props ?? {};
  const content = project?.content as { nodes: Node[]; edges: Edge[] };
  const [nodes, setNodes] = useState<Node[]>(
    initialNodes ?? content?.nodes ?? []
  );
  const [edges, setEdges] = useState<Edge[]>(
    initialEdges ?? content?.edges ?? []
  );
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([]);
  const {
    getEdges,
    toObject,
    screenToFlowPosition,
    getNodes,
    getNode,
    updateNode,
  } = useReactFlow();
  const analytics = useAnalytics();
  const [saveState, setSaveState] = useSaveProject();

  // Track previous content to prevent unnecessary comparisons
  const prevContentRef = useRef<string | null>(null);

  // Track if there are pending local changes
  const hasPendingChangesRef = useRef<boolean>(false);

  // Track last save timestamp to prevent race conditions
  const lastSaveTimestampRef = useRef<number>(0);

  // Sync nodes and edges when project updates via Realtime
  useEffect(() => {
    if (!content?.nodes || !content?.edges) {
      return;
    }

    // Serialize content once for comparison
    const contentString = JSON.stringify(content);

    // Skip if content hasn't changed at all
    if (prevContentRef.current === contentString) {
      return;
    }

    // CRITICAL: Don't overwrite local changes if save is pending or in progress
    // EXCEPTION: Allow updates to node state (like image generation completing)
    const timeSinceLastSave = Date.now() - lastSaveTimestampRef.current;
    const recentlySaved = timeSinceLastSave < 2000;

    if (hasPendingChangesRef.current || saveState.isSaving || recentlySaved) {
      // Check if this is just a node state update (not position/connection changes)
      const currentNodesById = new Map(nodes.map(n => [n.id, n]));
      const newNodesById = new Map(content.nodes.map(n => [n.id, n]));

      let onlyStateChanges = true;
      let hasStateChanges = false;
      const stateChangedNodes: string[] = [];

      // Check if only node data.state changed
      for (const [id, newNode] of newNodesById) {
        const currentNode = currentNodesById.get(id);
        if (!currentNode) {
          onlyStateChanges = false;
          break;
        }

        // Compare everything except data.state and data.updatedAt
        const { state: newState, updatedAt: newUpdatedAt, ...newDataRest } = (newNode.data || {}) as any;
        const { state: currentState, updatedAt: currentUpdatedAt, ...currentDataRest } = (currentNode.data || {}) as any;

        if (JSON.stringify(newDataRest) !== JSON.stringify(currentDataRest) ||
          newNode.position.x !== currentNode.position.x ||
          newNode.position.y !== currentNode.position.y) {
          onlyStateChanges = false;
          break;
        }

        if (JSON.stringify(newState) !== JSON.stringify(currentState)) {
          hasStateChanges = true;
          stateChangedNodes.push(id);
        }
      }

      // If only state changed (like image generation completing), allow the update
      if (onlyStateChanges && hasStateChanges) {
        console.log('✅ Allowing state-only update during pending changes:', {
          projectId: project?.id,
          hasStateChanges,
          stateChangedNodes,
          hasPendingChanges: hasPendingChangesRef.current,
          isSaving: saveState.isSaving,
          recentlySaved,
          timeSinceLastSave,
        });

        // Apply only the state changes to current nodes
        setNodes(prevNodes => {
          return prevNodes.map(node => {
            const newNode = newNodesById.get(node.id);
            if (newNode && stateChangedNodes.includes(node.id)) {
              return {
                ...node,
                data: {
                  ...node.data,
                  state: (newNode.data as any)?.state,
                  updatedAt: (newNode.data as any)?.updatedAt,
                }
              };
            }
            return node;
          });
        });

        // Update the ref to prevent repeated updates
        prevContentRef.current = contentString;
        return;
      } else {
        console.log('⏸️ Skipping realtime update - local changes pending:', {
          hasPendingChanges: hasPendingChangesRef.current,
          isSaving: saveState.isSaving,
          recentlySaved,
          timeSinceLastSave,
          onlyStateChanges,
          hasStateChanges,
          projectId: project?.id,
        });
        // Update the ref to prevent repeated checks during the pending period
        prevContentRef.current = contentString;
        return;
      }
    }

    // Only log when we're actually checking (content changed)
    console.log('🔄 Checking for canvas sync:', {
      projectNodeCount: content.nodes.length,
      projectEdgeCount: content.edges.length,
      canvasNodeCount: nodes.length,
      canvasEdgeCount: edges.length,
      projectId: project?.id,
      projectUpdatedAt: project?.updatedAt,
    });

    // Compare with current state using refs to avoid triggering re-renders
    const currentNodesString = JSON.stringify(nodes);
    const currentEdgesString = JSON.stringify(edges);
    const contentNodesString = JSON.stringify(content.nodes);
    const contentEdgesString = JSON.stringify(content.edges);

    const nodesChanged = currentNodesString !== contentNodesString;
    const edgesChanged = currentEdgesString !== contentEdgesString;

    if (nodesChanged || edgesChanged) {
      console.log('✅ Content changed via Realtime, updating canvas:', {
        nodesChanged,
        edgesChanged,
        projectUpdatedAt: project?.updatedAt,
      });

      // Update canvas with new data from realtime
      setNodes(content.nodes);
      setEdges(content.edges);

      // Update previous content reference AFTER updating state
      prevContentRef.current = contentString;
    } else {
      console.log('ℹ️ Content unchanged, skipping update');
      // Still update the ref to avoid repeated checks
      prevContentRef.current = contentString;
    }
  }, [content, project?.id, project?.updatedAt, saveState.isSaving]);

  const save = useDebouncedCallback(async () => {
    if (saveState.isSaving || !project?.userId || !project?.id) {
      return;
    }

    const saveWithRetry = async (retries = 2) => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const newContent = toObject();
          const response = await updateProjectAction(project.id, {
            content: newContent,
          });

          if ('error' in response) {
            throw new Error(response.error);
          }

          return newContent;
        } catch (error) {
          console.log(`Save attempt ${attempt + 1} failed:`, error instanceof Error ? error.message : error);

          if (attempt === retries) {
            throw error;
          }

          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    };

    try {
      setSaveState((prev) => ({ ...prev, isSaving: true }));

      // Optimistic mutation: update cache before saving
      const newContent = toObject();
      const cacheKey = `/api/projects/${project.id}`;

      mutate(
        cacheKey,
        { ...project, content: newContent },
        { revalidate: false }
      );

      await saveWithRetry();

      // Update timestamp and clear flags
      lastSaveTimestampRef.current = Date.now();
      setSaveState((prev) => ({ ...prev, lastSaved: new Date() }));

      // Clear pending changes flag AFTER save completes
      hasPendingChangesRef.current = false;
    } catch (error) {
      // Extract only the error message to prevent raw data from being displayed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      handleError('Error saving project', errorMessage);
      // Revert optimistic mutation in case of error
      mutate(`/api/projects/${project.id}`);
      // Keep pending flag on error so realtime doesn't overwrite
      hasPendingChangesRef.current = true;
    } finally {
      setSaveState((prev) => ({ ...prev, isSaving: false }));
    }
  }, 1000);

  const handleNodesChange = useCallback<OnNodesChange>(
    (changes) => {
      // Mark that we have pending changes
      hasPendingChangesRef.current = true;

      setNodes((current) => {
        const updated = applyNodeChanges(changes, current);
        save();
        onNodesChange?.(changes);
        return updated;
      });
    },
    [save, onNodesChange]
  );

  const handleEdgesChange = useCallback<OnEdgesChange>(
    (changes) => {
      // Mark that we have pending changes
      hasPendingChangesRef.current = true;

      setEdges((current) => {
        const updated = applyEdgeChanges(changes, current);
        save();
        onEdgesChange?.(changes);
        return updated;
      });
    },
    [save, onEdgesChange]
  );

  const handleConnect = useCallback<OnConnect>(
    (connection) => {
      const newEdge: Edge = {
        id: nanoid(),
        type: 'animated',
        ...connection,
      };

      setEdges((eds: Edge[]) => eds.concat(newEdge));
      save();
      onConnect?.(connection);
    },
    [save, onConnect]
  );

  const addNode = useCallback(
    (type: string, options?: Record<string, unknown>) => {
      const { data: nodeData, ...rest } = options ?? {};
      const newNode: Node = {
        id: nanoid(),
        type,
        data: {
          ...(nodeData ? nodeData : {}),
        },
        position: { x: 0, y: 0 },
        origin: [0, 0.5],
        ...rest,
      };

      setNodes((nds: Node[]) => nds.concat(newNode));
      save();

      analytics.track('toolbar', 'node', 'added', {
        type,
      });

      return newNode.id;
    },
    [save, analytics]
  );

  const duplicateNode = useCallback(
    (id: string) => {
      const node = getNode(id);

      if (!node || !node.type) {
        return;
      }

      const { id: oldId, ...rest } = node;

      const newId = addNode(node.type, {
        ...rest,
        position: {
          x: node.position.x + 200,
          y: node.position.y + 200,
        },
        selected: true,
      });

      setTimeout(() => {
        updateNode(id, { selected: false });
        updateNode(newId, { selected: true });
      }, 0);
    },
    [addNode, getNode, updateNode]
  );

  const handleConnectEnd = useCallback<OnConnectEnd>(
    (event, connectionState) => {
      // when a connection is dropped on the pane it's not valid

      if (!connectionState.isValid) {
        // we need to remove the wrapper bounds, in order to get the correct position
        const { clientX, clientY } =
          'changedTouches' in event ? event.changedTouches[0] : event;

        const sourceId = connectionState.fromNode?.id;
        const isSourceHandle = connectionState.fromHandle?.type === 'source';

        if (!sourceId) {
          return;
        }

        const newNodeId = addNode('drop', {
          position: screenToFlowPosition({ x: clientX, y: clientY }),
          data: {
            isSource: !isSourceHandle,
          },
        });

        setEdges((eds: Edge[]) =>
          eds.concat({
            id: nanoid(),
            source: isSourceHandle ? sourceId : newNodeId,
            target: isSourceHandle ? newNodeId : sourceId,
            type: 'temporary',
          })
        );
      }
    },
    [addNode, screenToFlowPosition]
  );

  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      // we are using getNodes and getEdges helpers here
      // to make sure we create isValidConnection function only once
      const nodes = getNodes();
      const edges = getEdges();
      const target = nodes.find((node) => node.id === connection.target);

      // Prevent connecting audio nodes to anything except transcribe nodes
      if (connection.source) {
        const source = nodes.find((node) => node.id === connection.source);

        if (!source || !target) {
          return false;
        }

        const valid = isValidSourceTarget(source, target);

        if (!valid) {
          return false;
        }
      }

      // Prevent cycles
      const hasCycle = (node: Node, visited = new Set<string>()) => {
        if (visited.has(node.id)) {
          return false;
        }

        visited.add(node.id);

        for (const outgoer of getOutgoers(node, nodes, edges)) {
          if (outgoer.id === connection.source || hasCycle(outgoer, visited)) {
            return true;
          }
        }
      };

      if (!target || target.id === connection.source) {
        return false;
      }

      return !hasCycle(target);
    },
    [getNodes, getEdges]
  );

  const handleConnectStart = useCallback<OnConnectStart>(() => {
    // Delete any drop nodes when starting to drag a node
    setNodes((nds: Node[]) => nds.filter((n: Node) => n.type !== 'drop'));
    setEdges((eds: Edge[]) => eds.filter((e: Edge) => e.type !== 'temporary'));
    save();
  }, [save]);

  const addDropNode = useCallback<MouseEventHandler<HTMLDivElement>>(
    (event) => {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      const { x, y } = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode('drop', {
        position: { x, y },
      });
    },
    [addNode, screenToFlowPosition]
  );

  const handleSelectAll = useCallback(() => {
    setNodes((nodes: Node[]) =>
      nodes.map((node: Node) => ({ ...node, selected: true }))
    );
  }, []);

  const handleCopy = useCallback(() => {
    const selectedNodes = getNodes().filter((node) => node.selected);
    if (selectedNodes.length > 0) {
      console.log('📋 Copying nodes:', {
        count: selectedNodes.length,
        nodes: selectedNodes.map(n => ({
          id: n.id,
          type: n.type,
          hasData: !!n.data,
          dataKeys: n.data ? Object.keys(n.data) : [],
          state: (n.data as any)?.state,
          generated: (n.data as any)?.generated,
        }))
      });
      setCopiedNodes(selectedNodes);
      toast.success(`Copied ${selectedNodes.length} node(s)`);
    }
  }, [getNodes]);

  const handlePaste = useCallback(async (event?: ClipboardEvent | globalThis.ClipboardEvent) => {
    console.log('🎯 handlePaste called:', {
      hasEvent: !!event,
      hasProjectId: !!project?.id,
      copiedNodesCount: copiedNodes.length,
      hasClipboardData: !!event?.clipboardData,
    });

    // Check for image in clipboard first
    if (event && project?.id) {
      const items = event.clipboardData?.items;

      if (items) {
        console.log('📋 Clipboard items:', {
          count: items.length,
          types: Array.from(items).map(item => ({
            type: item.type,
            kind: item.kind,
          }))
        });

        // Check if there's an image in clipboard
        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          console.log(`📄 Checking item ${i}:`, {
            type: item.type,
            kind: item.kind,
            isImage: item.type.indexOf('image') !== -1,
          });

          if (item.type.indexOf('image') !== -1) {
            event.preventDefault();

            const file = item.getAsFile();
            console.log('📁 Got file from clipboard:', {
              hasFile: !!file,
              fileName: file?.name,
              fileSize: file?.size,
              fileType: file?.type,
            });

            if (!file) {
              console.log('❌ No file extracted from clipboard item');
              continue;
            }

            try {
              console.log('⬆️ Starting image upload...');
              toast.info('Uploading image...');

              // Upload the image first
              const { url, type } = await uploadFile(file, 'files');
              console.log('✅ Upload complete:', { url, type });

              // Create node with the uploaded image URL
              const nodeId = nanoid();
              const newNode: Node = {
                id: nodeId,
                type: 'image',
                data: {
                  content: {
                    url,
                    type,
                  }
                },
                position: screenToFlowPosition({
                  x: window.innerWidth / 2,
                  y: window.innerHeight / 2
                }),
                origin: [0, 0.5],
              };

              setNodes((nds: Node[]) => nds.concat(newNode));
              console.log('✅ Created image node:', nodeId);

              save();
              toast.success('Image pasted successfully');

              analytics.track('canvas', 'image', 'pasted', {
                type,
              });

              return; // Exit after handling image
            } catch (error) {
              handleError('Error pasting image', error);
              return;
            }
          }
        }
      }
    }

    // If no image found, try to paste copied nodes
    if (copiedNodes.length > 0) {
      console.log('📌 Pasting nodes:', {
        count: copiedNodes.length,
        copiedNodes: copiedNodes.map(n => ({
          id: n.id,
          type: n.type,
          hasData: !!n.data,
          dataKeys: n.data ? Object.keys(n.data) : [],
          state: (n.data as any)?.state,
          generated: (n.data as any)?.generated,
        }))
      });

      const newNodes = copiedNodes.map((node) => {
        // Deep clone the node data to preserve all properties (images, videos, etc.)
        const clonedData = node.data ? JSON.parse(JSON.stringify(node.data)) : {};

        console.log('🔄 Cloning node:', {
          originalId: node.id,
          type: node.type,
          originalData: node.data,
          clonedData,
        });

        return {
          ...node,
          id: nanoid(),
          data: clonedData,
          position: {
            x: node.position.x + 200,
            y: node.position.y + 200,
          },
          selected: true,
        };
      });

      console.log('✅ New nodes created:', {
        count: newNodes.length,
        nodes: newNodes.map(n => ({
          id: n.id,
          type: n.type,
          hasData: !!n.data,
          dataKeys: n.data ? Object.keys(n.data) : [],
          state: (n.data as any)?.state,
          generated: (n.data as any)?.generated,
        }))
      });

      // Unselect all existing nodes
      setNodes((nodes: Node[]) =>
        nodes.map((node: Node) => ({
          ...node,
          selected: false,
        }))
      );

      // Add new nodes
      setNodes((nodes: Node[]) => [...nodes, ...newNodes]);
      save();
      toast.success(`Pasted ${newNodes.length} node(s)`);
      return;
    }

    console.log('ℹ️ Nothing to paste');
  }, [copiedNodes, save, project?.id, screenToFlowPosition, updateNode, analytics]);



  const handleDuplicateAll = useCallback(() => {
    const selected = getNodes().filter((node) => node.selected);

    for (const node of selected) {
      duplicateNode(node.id);
    }
  }, [getNodes, duplicateNode]);

  const handleContextMenu = useCallback((event: MouseEvent) => {
    if (
      !(event.target instanceof HTMLElement) ||
      !event.target.classList.contains('react-flow__pane')
    ) {
      event.preventDefault();
    }
  }, []);

  useHotkeys('meta+a', handleSelectAll, {
    enableOnContentEditable: false,
    preventDefault: true,
  });

  useHotkeys('meta+d', handleDuplicateAll, {
    enableOnContentEditable: false,
    preventDefault: true,
  });

  useHotkeys('meta+c', handleCopy, {
    enableOnContentEditable: false,
    preventDefault: true,
  });

  // Handle paste event for both nodes and images
  useEffect(() => {
    const handlePasteEvent = (event: globalThis.ClipboardEvent) => {
      console.log('📎 Paste event detected:', {
        hasClipboardData: !!event.clipboardData,
        itemsCount: event.clipboardData?.items?.length,
      });
      handlePaste(event);
    };

    document.addEventListener('paste', handlePasteEvent);

    return () => {
      document.removeEventListener('paste', handlePasteEvent);
    };
  }, [handlePaste]);

  return (
    <NodeOperationsProvider addNode={addNode} duplicateNode={duplicateNode}>
      <NodeDropzoneProvider>
        <ContextMenu>
          <ContextMenuTrigger onContextMenu={handleContextMenu}>
            <ReactFlow
              deleteKeyCode={['Backspace', 'Delete']}
              nodes={nodes}
              onNodesChange={handleNodesChange}
              edges={edges.map((edge) => ({
                ...edge,
                // Aplicar estilo vermelho para edges conectadas ao handle negative-prompt
                style: edge.targetHandle === 'negative-prompt'
                  ? { stroke: '#ef4444', strokeWidth: 2 }
                  : edge.style,
                animated: edge.targetHandle === 'negative-prompt',
              }))}
              onEdgesChange={handleEdgesChange}
              onConnectStart={handleConnectStart}
              onConnect={handleConnect}
              onConnectEnd={handleConnectEnd}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              isValidConnection={isValidConnection}
              connectionLineComponent={ConnectionLine}
              panOnScroll
              fitView
              zoomOnDoubleClick={false}
              panOnDrag={false}
              selectionOnDrag={true}
              onDoubleClick={addDropNode}
              {...rest}
            >
              <Background />
              {children}
            </ReactFlow>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={addDropNode}>
              <PlusIcon size={12} />
              <span>Add a new node</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={handleSelectAll}>
              <BoxSelectIcon size={12} />
              <span>Select all</span>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </NodeDropzoneProvider>
    </NodeOperationsProvider>
  );
};
