'use client';

interface BlockNode {
  id: string;
  label: string;
  sublabel?: string;
  color?: string;
}

interface BlockConnection {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

interface DiagramBlockProps {
  nodes: BlockNode[];
  connections: BlockConnection[];
  title?: string;
  direction?: 'horizontal' | 'vertical';
}

const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: '#3b82f6', border: '#2563eb', text: '#fff' },
  lightBlue: { bg: '#60a5fa', border: '#3b82f6', text: '#fff' },
  lighterBlue: { bg: '#93c5fd', border: '#60a5fa', text: '#000' },
  green: { bg: '#10b981', border: '#059669', text: '#fff' },
  orange: { bg: '#f59e0b', border: '#d97706', text: '#fff' },
  purple: { bg: '#8b5cf6', border: '#7c3aed', text: '#fff' },
  pink: { bg: '#ec4899', border: '#db2777', text: '#fff' },
  red: { bg: '#ef4444', border: '#dc2626', text: '#fff' },
  teal: { bg: '#14b8a6', border: '#0d9488', text: '#fff' },
  indigo: { bg: '#6366f1', border: '#4f46e5', text: '#fff' },
};

export function DiagramBlock({ nodes, connections, title, direction = 'vertical' }: DiagramBlockProps): React.ReactElement {
  const getNodeColor = (color?: string): { bg: string; border: string; text: string } => {
    if (!color) return colorMap.blue;
    return colorMap[color] || colorMap.blue;
  };

  const getNodeById = (id: string): BlockNode | undefined => {
    return nodes.find((n) => n.id === id);
  };

  const renderNode = (node: BlockNode): React.ReactElement => {
    const colors = getNodeColor(node.color);
    return (
      <div
        key={node.id}
        className="rounded-lg p-4 shadow-md min-w-[180px] text-center"
        style={{
          backgroundColor: colors.bg,
          border: `2px solid ${colors.border}`,
          color: colors.text,
        }}
      >
        <div className="font-semibold text-sm mb-1">{node.label}</div>
        {node.sublabel && (
          <div className="text-xs opacity-90 whitespace-pre-line mt-1">{node.sublabel}</div>
        )}
      </div>
    );
  };

  const renderConnection = (conn: BlockConnection, index: number): React.ReactElement | null => {
    const fromNode = getNodeById(conn.from);
    const toNode = getNodeById(conn.to);
    if (!fromNode || !toNode) return null;

    if (direction === 'vertical') {
      return (
        <div key={`conn-${index}`} className="flex flex-col items-center">
          <div
            className={`w-0.5 h-8 ${conn.dashed ? 'border-dashed border-l-2' : ''}`}
            style={conn.dashed ? { borderColor: '#9ca3af' } : { backgroundColor: '#9ca3af' }}
          />
          {conn.label && (
            <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200 my-1">
              {conn.label}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div key={`conn-${index}`} className="flex flex-row items-center">
          <div
            className={`h-0.5 w-8 ${conn.dashed ? 'border-dashed border-t-2' : ''}`}
            style={conn.dashed ? { borderColor: '#9ca3af' } : { backgroundColor: '#9ca3af' }}
          />
          {conn.label && (
            <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200 mx-1 whitespace-pre-line">
              {conn.label}
            </div>
          )}
        </div>
      );
    }
  };

  // Build the diagram structure
  const renderDiagram = (): React.ReactElement[] => {
    const elements: React.ReactElement[] = [];
    
    nodes.forEach((node, index) => {
      elements.push(renderNode(node));
      
      // Find connections from this node
      const nodeConnections = connections.filter((c) => c.from === node.id);
      
      if (nodeConnections.length > 0 && index < nodes.length - 1) {
        nodeConnections.forEach((conn, connIndex) => {
          const connElement = renderConnection(conn, index * 100 + connIndex);
          if (connElement) {
            elements.push(connElement);
          }
        });
      }
    });

    return elements;
  };

  return (
    <div className="my-6 rounded-lg overflow-hidden border border-gray-200 bg-white">
      {title && (
        <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 border-b border-gray-200">
          {title}
        </div>
      )}
      <div className="p-6 flex justify-center items-center bg-white overflow-x-auto">
        <div className={`flex ${direction === 'horizontal' ? 'flex-row items-center' : 'flex-col items-center'} gap-4`}>
          {renderDiagram()}
        </div>
      </div>
    </div>
  );
}
