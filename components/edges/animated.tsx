import {
  BaseEdge,
  type EdgeProps,
  type InternalNode,
  type Node,
  getBezierPath,
  useInternalNode,
} from '@xyflow/react';
import { Position } from '@xyflow/react';

const getHandleCoordsByPosition = (
  node: InternalNode<Node>,
  handlePosition: Position,
  handleId?: string | null
) => {
  // Choose the handle type based on position - Left is for target, Right is for source
  const handleType = handlePosition === Position.Left ? 'target' : 'source';

  // Se handleId for fornecido, procurar pelo handle específico
  // Caso contrário, pegar o primeiro handle na posição
  let handle;

  if (handleId) {
    // Primeiro tentar encontrar pelo ID exato
    handle = node.internals.handleBounds?.[handleType]?.find(
      (h) => h.id === handleId && h.position === handlePosition
    );
  }

  // Fallback: pegar o primeiro handle na posição
  if (!handle) {
    handle = node.internals.handleBounds?.[handleType]?.find(
      (h) => h.position === handlePosition
    );
  }

  if (!handle) {
    return [0, 0];
  }

  let offsetX = handle.width / 2;
  let offsetY = handle.height / 2;

  // this is a tiny detail to make the markerEnd of an edge visible.
  // The handle position that gets calculated has the origin top-left, so depending which side we are using, we add a little offset
  // when the handlePosition is Position.Right for example, we need to add an offset as big as the handle itself in order to get the correct position
  switch (handlePosition) {
    case Position.Left:
      offsetX = 0;
      break;
    case Position.Right:
      offsetX = handle.width;
      break;
    case Position.Top:
      offsetY = 0;
      break;
    case Position.Bottom:
      offsetY = handle.height;
      break;
    default:
      throw new Error(`Invalid handle position: ${handlePosition}`);
  }

  const x = node.internals.positionAbsolute.x + handle.x + offsetX;
  const y = node.internals.positionAbsolute.y + handle.y + offsetY;

  return [x, y];
};

const getEdgeParams = (
  source: InternalNode<Node>,
  target: InternalNode<Node>,
  sourceHandleId?: string | null,
  targetHandleId?: string | null
) => {
  const sourcePos = Position.Right;
  const [sx, sy] = getHandleCoordsByPosition(source, sourcePos, sourceHandleId);
  const targetPos = Position.Left;
  const [tx, ty] = getHandleCoordsByPosition(target, targetPos, targetHandleId);

  return {
    sx,
    sy,
    tx,
    ty,
    sourcePos,
    targetPos,
  };
};

export const AnimatedEdge = (props: EdgeProps) => {
  const { id, source, target, markerEnd, style } = props;
  // Acessar sourceHandle e targetHandle diretamente do props (podem não estar no tipo)
  const sourceHandle = (props as any).sourceHandle;
  const targetHandle = (props as any).targetHandle;

  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode,
    sourceHandle,
    targetHandle
  );

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <circle r="4" fill="var(--primary)">
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  );
};
