import * as React from 'react';
import {
  FALLBACK_ROADMAP_SNAPSHOT,
  loadRoadmapSnapshot,
  type RoadmapLoadResult,
  type RoadmapMetaSnapshot,
  type RoadmapSnapshot,
  type RoadmapStatus,
} from '../shared/roadmapStatus.js';

let roadmapSnapshotRequest: Promise<RoadmapLoadResult> | null = null;

function loadRoadmapSnapshotOnce() {
  roadmapSnapshotRequest ??= loadRoadmapSnapshot();
  return roadmapSnapshotRequest;
}

function statusClass(status: RoadmapStatus) {
  return status === 'OK'
    ? 'roadmap-status roadmap-status-ok'
    : status === 'EN PROCESO'
      ? 'roadmap-status roadmap-status-active'
      : 'roadmap-status roadmap-status-pending';
}

const RoadmapNode: React.FC<{ item: RoadmapMetaSnapshot | NonNullable<RoadmapMetaSnapshot['children']>[number]; child?: boolean }> = ({
  item,
  child = false,
}) => (
  <li className={child ? 'roadmap-node roadmap-node-child' : 'roadmap-node'}>
    <div className="roadmap-node-row">
      <div className="roadmap-node-copy">
        <strong>{item.id}</strong>
        {item.label && <span> · {item.label}</span>}
        {'pointsEarned' in item && (
          <span className="roadmap-node-points"> · {item.pointsEarned}/{item.pointsMax} pts</span>
        )}
      </div>
      <span className={statusClass(item.status)}>{item.status}</span>
    </div>
    {'children' in item && item.children && (
      <ul className="roadmap-children">
        {item.children.map((childItem) => (
          <RoadmapNode key={childItem.id} item={childItem} child />
        ))}
      </ul>
    )}
  </li>
);

interface RoadmapStatusViewProps {
  snapshot: RoadmapSnapshot;
  live: boolean;
}

export const RoadmapStatusView: React.FC<RoadmapStatusViewProps> = ({ snapshot, live }) => (
  <aside className="roadmap-status-panel" aria-labelledby="roadmap-status-title">
    <div className="roadmap-panel-heading">
      <div>
        <span className="roadmap-kicker">Roadmap</span>
        <h2 id="roadmap-status-title">Avance del proyecto</h2>
      </div>
      <span className={live ? 'roadmap-source roadmap-source-live' : 'roadmap-source roadmap-source-stale'}>
        {live ? 'GitHub · live' : 'Fallback · stale/no-live'}
      </span>
    </div>

    <div className="roadmap-progress-summary">
      <div className="roadmap-progress-copy">
        <span>Avance acumulado</span>
        <strong>{snapshot.overallPercent}%</strong>
      </div>
      <div
        className="roadmap-progress-track"
        role="progressbar"
        aria-label="Avance ponderado acumulado"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={snapshot.overallPercent}
      >
        <span style={{ width: `${snapshot.overallPercent}%` }} />
      </div>
      <p>{snapshot.summary}</p>
    </div>

    <ul className="roadmap-tree">
      {snapshot.metas.map((item) => (
        <RoadmapNode key={item.id} item={item} />
      ))}
    </ul>

    <p className="roadmap-metric-note">
      Cada meta conserva 20 puntos; cuando tiene subtareas canónicas, esos puntos se reparten entre ellas.
    </p>
  </aside>
);

export const RoadmapStatusPanel: React.FC = () => {
  const [result, setResult] = React.useState<RoadmapLoadResult>({
    snapshot: FALLBACK_ROADMAP_SNAPSHOT,
    live: false,
  });

  React.useEffect(() => {
    let active = true;
    loadRoadmapSnapshotOnce().then((next) => {
      if (active) setResult(next);
    });
    return () => {
      active = false;
    };
  }, []);

  return <RoadmapStatusView snapshot={result.snapshot} live={result.live} />;
};
