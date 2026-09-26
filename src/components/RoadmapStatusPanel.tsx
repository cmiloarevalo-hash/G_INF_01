import React, { type CSSProperties, type FC } from 'react';

type RoadmapStatus = 'OK' | 'EN PROCESO' | 'PENDIENTE';

interface RoadmapItem {
  id: string;
  label?: string;
  status: RoadmapStatus;
  children?: RoadmapItem[];
}

const ROADMAP_ITEMS: RoadmapItem[] = [
  { id: 'M1', label: 'Análisis invitado de una llamada', status: 'OK' },
  {
    id: 'M2',
    label: 'Publicación comprobada del piloto',
    status: 'EN PROCESO',
    children: [
      { id: 'M2.1', label: 'Preparar la versión', status: 'EN PROCESO' },
      { id: 'M2.2', label: 'Configurar acceso seguro', status: 'PENDIENTE' },
      { id: 'M2.3', label: 'Publicar y probar', status: 'PENDIENTE' },
      { id: 'M2.4', label: 'Registrar y decidir', status: 'PENDIENTE' },
    ],
  },
  {
    id: 'M3',
    label: 'Resultado e informe para invitado',
    status: 'OK',
    children: [
      { id: 'M3.1', status: 'OK' },
      { id: 'M3.2', status: 'OK' },
      { id: 'M3.3', status: 'OK' },
      { id: 'M3.4', status: 'OK' },
    ],
  },
  { id: 'M4', label: 'Trabajo persistente y capacidades completas', status: 'PENDIENTE' },
  { id: 'M5', label: 'Integración del producto completo', status: 'PENDIENTE' },
];

function statusClass(status: RoadmapStatus) {
  return status === 'OK'
    ? 'roadmap-status roadmap-status-ok'
    : status === 'EN PROCESO'
      ? 'roadmap-status roadmap-status-active'
      : 'roadmap-status roadmap-status-pending';
}

const RoadmapNode: FC<{ item: RoadmapItem; child?: boolean }> = ({ item, child = false }) => (
  <li className={child ? 'roadmap-node roadmap-node-child' : 'roadmap-node'}>
    <div className="roadmap-node-row">
      <div className="roadmap-node-copy">
        <strong>{item.id}</strong>
        {item.label && <span> · {item.label}</span>}
      </div>
      <span className={statusClass(item.status)}>{item.status}</span>
    </div>
    {item.children && (
      <ul className="roadmap-children">
        {item.children.map((childItem) => (
          <RoadmapNode key={childItem.id} item={childItem} child />
        ))}
      </ul>
    )}
  </li>
);

export const RoadmapStatusPanel: FC = () => (
  <aside className="roadmap-status-panel" aria-labelledby="roadmap-status-title">
    <div className="roadmap-panel-heading">
      <span className="roadmap-kicker">Roadmap</span>
      <h2 id="roadmap-status-title">Avance del proyecto</h2>
    </div>

    <div className="roadmap-progress-summary">
      <div className="roadmap-progress-copy">
        <span>Avance acumulado</span>
        <strong>40%</strong>
      </div>
      <div
        className="roadmap-progress-track"
        role="progressbar"
        aria-label="Avance administrativo acumulado"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={40}
      >
        <span style={{ width: '40%' } as CSSProperties} />
      </div>
      <p>2 metas cerradas de 5</p>
    </div>

    <ul className="roadmap-tree">
      {ROADMAP_ITEMS.map((item) => (
        <RoadmapNode key={item.id} item={item} />
      ))}
    </ul>

    <p className="roadmap-metric-note">La métrica suma sólo metas completamente cerradas.</p>
  </aside>
);
