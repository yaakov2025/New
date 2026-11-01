// Development-prototype persistence: a single JSON file under ./data.
// Enforces the Google caching tiers on every load and every hour:
//   Tier 1  placeId                  – kept indefinitely
//   Tier 2  geocoded coordinates      – purged 30 days after caching
//           Solar building insights   – purged 30 days after fetch
//   Tier 3  map tiles / imagery       – never fetched or stored server-side
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.ts';
import type { PropertyRecord } from '../shared/types.ts';

interface StoreFile {
  properties: PropertyRecord[];
  usage: { date: string; solar: number; geocode: number; addressValidation: number };
}

const today = () => new Date().toISOString().slice(0, 10);

class Store {
  private data: StoreFile;
  private file: string;

  constructor(file: string) {
    this.file = path.resolve(file);
    this.data = { properties: [], usage: { date: today(), solar: 0, geocode: 0, addressValidation: 0 } };
    try {
      if (fs.existsSync(this.file)) this.data = { ...this.data, ...JSON.parse(fs.readFileSync(this.file, 'utf8')) };
    } catch (e) {
      console.error('[store] could not read data file, starting empty:', (e as Error).message);
    }
    for (const p of this.data.properties) {
      p.branch ??= '';
      p.takeoff.existingSolar = { ...{ systemKw: null, inverterType: null, installYear: null, reroofCondition: null }, ...(p.takeoff.existingSolar as Partial<typeof p.takeoff.existingSolar>) } as typeof p.takeoff.existingSolar;
    }
    this.purgeExpired();
    setInterval(() => this.purgeExpired(), 3600_000).unref();
  }

  private save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  purgeExpired(): number {
    const t = Date.now();
    let n = 0;
    for (const p of this.data.properties) {
      if (p.coordinates && Date.parse(p.coordinates.expiresAt) <= t) {
        p.coordinates = null;
        n++;
      }
      if (p.solar && Date.parse(p.solar.expiresAt) <= t) {
        p.solar = null;
        p.solarStatus = {
          state: 'EXPIRED',
          message: 'Cached Google Solar data passed its 30-day limit and was deleted.',
          fix: 'Click "Refresh Google data" to request it again.',
        };
        n++;
      }
    }
    if (n) this.save();
    return n;
  }

  list(): PropertyRecord[] {
    return [...this.data.properties].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  get(id: string) {
    return this.data.properties.find((p) => p.id === id) ?? null;
  }

  findByPlaceId(placeId: string) {
    return this.data.properties.find((p) => p.placeId === placeId) ?? null;
  }

  /** Same building looked up two ways (autocomplete vs typed) can get different Place IDs. */
  findByAddress(formatted: string) {
    const k = formatted.trim().toLowerCase();
    return this.data.properties.find((p) => p.formattedAddress.trim().toLowerCase() === k) ?? null;
  }

  upsert(p: PropertyRecord) {
    const i = this.data.properties.findIndex((x) => x.id === p.id);
    if (i >= 0) this.data.properties[i] = p;
    else this.data.properties.push(p);
    this.save();
    return p;
  }

  remove(id: string) {
    const before = this.data.properties.length;
    this.data.properties = this.data.properties.filter((p) => p.id !== id);
    this.save();
    return this.data.properties.length < before;
  }

  /** Returns false (and does not count) when the daily cap is reached. */
  tryUse(api: 'solar' | 'geocode' | 'addressValidation'): boolean {
    if (this.data.usage.date !== today()) this.data.usage = { date: today(), solar: 0, geocode: 0, addressValidation: 0 };
    if (this.data.usage[api] >= config.dailyLimits[api]) return false;
    this.data.usage[api]++;
    this.save();
    return true;
  }

  usage() {
    if (this.data.usage.date !== today()) this.data.usage = { date: today(), solar: 0, geocode: 0, addressValidation: 0 };
    return { ...this.data.usage, limits: config.dailyLimits };
  }
}

export const store = new Store(config.dataFile);
