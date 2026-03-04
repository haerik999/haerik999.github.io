'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphNode {
  id: string;
  label: string;
  category?: string;
  val: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const CATEGORY_COLORS: Record<string, string> = {
  IoT: '#3b82f6',
  Python: '#f59e0b',
  General: '#6b7280',
};
const DEFAULT_COLOR = '#9ca3af';

function getNodeColor(category?: string): string {
  if (!category) return DEFAULT_COLOR;
  return CATEGORY_COLORS[category] || DEFAULT_COLOR;
}

export function KnowledgeGraph() {
  const router = useRouter();
  const [data, setData] = useState<GraphData | null>(null);
  const graphRef = useRef<any>(null);

  useEffect(() => {
    fetch('/graph-data.json')
      .then(res => res.json())
      .then((d: GraphData) => setData(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (data && graphRef.current) {
      setTimeout(() => {
        graphRef.current.zoomToFit(400, 60);
      }, 500);
    }
  }, [data]);

  const handleNodeClick = useCallback((node: any) => {
    router.push(`/posts/${node.id}`);
  }, [router]);

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as GraphNode;
    const label = n.label;
    const fontSize = Math.max(12 / globalScale, 3);
    const nodeSize = Math.sqrt(n.val) * 4;
    const color = getNodeColor(n.category);

    // Node circle
    ctx.beginPath();
    ctx.arc(n.x!, n.y!, nodeSize, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5 / globalScale;
    ctx.stroke();

    // Label
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#374151';
    ctx.fillText(label, n.x!, n.y! + nodeSize + 2);
  }, []);

  if (!data) {
    return (
      <div className="w-full h-[400px] border border-gray-200 rounded-xl flex items-center justify-center">
        <span className="text-sm text-gray-400">Loading graph...</span>
      </div>
    );
  }

  if (data.nodes.length === 0) {
    return null;
  }

  return (
    <div className="w-full h-[400px] border border-gray-200 rounded-xl overflow-hidden">
      <ForceGraph2D
        ref={graphRef}
        graphData={data}
        nodeCanvasObject={paintNode as any}
        nodePointerAreaPaint={((node: any, color: string, ctx: CanvasRenderingContext2D) => {
          const n = node as GraphNode;
          const nodeSize = Math.sqrt(n.val) * 4;
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, nodeSize + 2, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }) as any}
        onNodeClick={handleNodeClick as any}
        nodeLabel={((node: any) => (node as GraphNode).label) as any}
        linkColor={() => '#e5e7eb'}
        linkWidth={1.5}
        backgroundColor="white"
        cooldownTicks={100}
        width={undefined}
        height={400}
      />
    </div>
  );
}
