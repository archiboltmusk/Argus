import { Component, type ReactNode } from "react";
import { LazyMount } from "@/components/lazy-mount";
import {
  applyPageRows,
  movePageRow,
  orderedRowKeys,
  renamePageRow,
  togglePageRowHidden,
  type PageRowCustomization,
} from "@/lib/page-rows";
import { RowControls } from "@/views/home/row-controls";
import type { MusicBand } from "./music-band-types";

const EAGER_BANDS = 2;

class BandBoundary extends Component<{ children: ReactNode; name: string }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error(`[MusicBand] Failed to render band "${this.props.name}":`, error);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function BandRenderer({ band }: { band: MusicBand }) {
  return (
    <BandBoundary name={band.key}>
      {band.render(band.title)}
    </BandBoundary>
  );
}

function BandSlot({
  band,
  index,
  hidden,
  editMode,
  at,
  orderKeys,
  allKeys,
  custom,
  onPersist,
}: {
  band: MusicBand;
  index: number;
  hidden: boolean;
  editMode: boolean;
  at: number;
  orderKeys: string[];
  allKeys: string[];
  custom: PageRowCustomization;
  onPersist: (next: PageRowCustomization) => void;
}) {
  return (
    <div data-scroll-anchor={`row:${band.key}`}>
      {editMode && (
        <RowControls
          name={band.title}
          hidden={hidden}
          canMoveUp={at > 0}
          canMoveDown={at >= 0 && at < orderKeys.length - 1}
          onMoveUp={() => onPersist(movePageRow(custom, allKeys, band.key, -1))}
          onMoveDown={() => onPersist(movePageRow(custom, allKeys, band.key, 1))}
          onToggleHidden={() => onPersist(togglePageRowHidden(custom, band.key))}
          onRename={(label) => onPersist(renamePageRow(custom, band.key, label))}
          onResetName={() => onPersist(renamePageRow(custom, band.key, ""))}
          isRenamed={band.key in custom.renamed}
        />
      )}
      {!hidden && (
        index < EAGER_BANDS ? (
          <BandRenderer band={band} />
        ) : (
          <LazyMount minHeight={240} rootMargin="350px 0px">
            <BandRenderer band={band} />
          </LazyMount>
        )
      )}
    </div>
  );
}

export function MusicBandStack({
  bands,
  custom,
  editMode,
  onPersist,
}: {
  bands: MusicBand[];
  custom: PageRowCustomization;
  editMode: boolean;
  onPersist: (next: PageRowCustomization) => void;
}) {
  const allKeys = bands.map((band) => band.key);
  const display = applyPageRows(bands, custom, editMode);
  const orderKeys = orderedRowKeys(allKeys, custom);

  return (
    <>
      {display.map((band, index) => {
        const hidden = custom.hidden.includes(band.key);
        if (hidden && !editMode) return null;
        const at = orderKeys.indexOf(band.key);
        return (
          <BandSlot
            key={band.key}
            band={band}
            index={index}
            hidden={hidden}
            editMode={editMode}
            at={at}
            orderKeys={orderKeys}
            allKeys={allKeys}
            custom={custom}
            onPersist={onPersist}
          />
        );
      })}
    </>
  );
}
