import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Loader2, Search } from 'lucide-react';

/**
 * Places UI Kit <gmp-basic-place-autocomplete> (session tokens are handled by
 * the element). On select we send ONLY the Place ID to our backend – the
 * browser never calls Geocoding/Address Validation/Solar directly.
 * A plain text box is always available as a fallback.
 */
export function AddressSearch({ busy, onSubmit }: { busy: boolean; onSubmit: (q: { placeId?: string; address?: string }) => void }) {
  const places = useMapsLibrary('places');
  const host = useRef<HTMLDivElement>(null);
  const [widgetFailed, setWidgetFailed] = useState(false);
  const [text, setText] = useState('');
  const submit = useRef(onSubmit);
  submit.current = onSubmit;

  useEffect(() => {
    if (!places || !host.current) return;
    const Ctor = (places as any).BasicPlaceAutocompleteElement;
    if (!Ctor) {
      setWidgetFailed(true);
      return;
    }
    const el: HTMLElement = new Ctor({ includedRegionCodes: ['us'] });
    el.setAttribute('placeholder', 'Search a US address…');
    const onSelect = (e: any) => {
      const id = e.place?.id ?? e.placePrediction?.placeId;
      if (id) submit.current({ placeId: id });
    };
    const onError = () => setWidgetFailed(true);
    el.addEventListener('gmp-select', onSelect);
    el.addEventListener('gmp-error', onError);
    host.current.replaceChildren(el);
    return () => {
      el.removeEventListener('gmp-select', onSelect);
      el.removeEventListener('gmp-error', onError);
      el.remove();
    };
  }, [places]);

  return (
    <div className="space-y-2">
      {!widgetFailed && <div ref={host} className="min-h-10" data-testid="places-autocomplete" />}
      {widgetFailed && (
        <p className="text-[11px] text-amber-300">Places autocomplete unavailable on this key (needs Places API (New)). Type the full address below.</p>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) onSubmit({ address: text.trim() });
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="…or type full address and press Enter"
          aria-label="Street address"
          className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Look up
        </button>
      </form>
    </div>
  );
}
