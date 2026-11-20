import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config';
import type { AuditEntry, Campaign, GroupRecord, ScheduledCampaign, StoreData } from '../types';
import { shortId } from '../utils/helpers';

const DEFAULT_DATA: StoreData = {
  groups: {},
  campaigns: {},
  scheduled: [],
  audit: [],
  deliveries: {},
  settings: {
    sendDelayMs: config.limits.sendDelayMs,
    maxSendsPerGroupDay: config.limits.maxSendsPerGroupDay,
    maxGroupsPerCampaign: config.limits.maxGroupsPerCampaign,
    requireAuthorization: config.limits.requireAuthorization,
    autoRead: config.limits.autoRead,
    groupCooldownMs: config.limits.groupCooldownMs,
  },
};

/** Almacén persistente en JSON con escritura atómica y respaldo. */
export class Store {
  private data: StoreData = structuredClone(DEFAULT_DATA);
  private writeQueue: Promise<void> = Promise.resolve();

  async init(): Promise<void> {
    await fs.mkdir(config.paths.dataDir, { recursive: true });
    await fs.mkdir(config.paths.mediaDir, { recursive: true });
    await fs.mkdir(config.paths.auth, { recursive: true });

    try {
      const raw = await fs.readFile(config.paths.dataFile, 'utf8');
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      this.data = {
        ...structuredClone(DEFAULT_DATA),
        ...parsed,
        groups: parsed.groups ?? {},
        campaigns: parsed.campaigns ?? {},
        scheduled: (parsed.scheduled ?? []).filter((s) => s.status !== 'cancelada'),
        audit: parsed.audit ?? [],
        deliveries: parsed.deliveries ?? {},
        settings: { ...DEFAULT_DATA.settings, ...(parsed.settings ?? {}) },
      };
    } catch {
      await this.save();
    }
  }

  get snapshot(): Readonly<StoreData> {
    return this.data;
  }

  // ---------------------------------------------------------------- Groups
  getGroup(id: string): GroupRecord | undefined {
    return this.data.groups[id];
  }

  listGroups(): GroupRecord[] {
    return Object.values(this.data.groups).sort((a, b) => b.addedAt - a.addedAt);
  }

  upsertGroup(group: GroupRecord): void {
    this.data.groups[group.id] = group;
    void this.save();
  }

  removeGroup(id: string): boolean {
    const existed = Boolean(this.data.groups[id]);
    delete this.data.groups[id];
    for (const key of Object.keys(this.data.deliveries)) {
      if (key.endsWith(`:${id}`)) delete this.data.deliveries[key];
    }
    if (existed) void this.save();
    return existed;
  }

  // ------------------------------------------------------------ Deliveries
  private deliveryKey(campaignId: string, groupId: string): string {
    return `${campaignId}:${groupId}`;
  }

  /** Momento en que esa campaña fue enviada por última vez a ese grupo. */
  lastDelivery(campaignId: string, groupId: string): number | undefined {
    return this.data.deliveries[this.deliveryKey(campaignId, groupId)];
  }

  /** Registra un envío para evitar duplicados durante el periodo de enfriamiento. */
  markDelivered(campaignId: string, groupId: string, at = Date.now()): void {
    this.data.deliveries[this.deliveryKey(campaignId, groupId)] = at;
    void this.save();
  }

  /** Borra el historial de envíos (de una campaña o de todas) para permitir reenvío. */
  clearDeliveries(campaignId?: string): number {
    const keys = Object.keys(this.data.deliveries).filter((k) =>
      campaignId ? k.startsWith(`${campaignId}:`) : true,
    );
    for (const key of keys) delete this.data.deliveries[key];
    if (keys.length) void this.save();
    return keys.length;
  }

  // ------------------------------------------------------------- Campaigns
  getCampaign(id: string): Campaign | undefined {
    const key = Object.keys(this.data.campaigns).find((k) => k.toLowerCase() === id.toLowerCase());
    return key ? this.data.campaigns[key] : undefined;
  }

  listCampaigns(): Campaign[] {
    return Object.values(this.data.campaigns).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  upsertCampaign(campaign: Campaign): void {
    this.data.campaigns[campaign.id] = campaign;
    void this.save();
  }

  removeCampaign(id: string): boolean {
    const campaign = this.getCampaign(id);
    if (!campaign) return false;
    delete this.data.campaigns[campaign.id];
    this.clearDeliveries(campaign.id);
    void this.save();
    return true;
  }

  // ------------------------------------------------------------- Scheduled
  listScheduled(): ScheduledCampaign[] {
    return this.data.scheduled
      .filter((s) => s.status !== 'cancelada')
      .sort((a, b) => a.executeAt - b.executeAt);
  }

  upsertScheduled(item: ScheduledCampaign): void {
    const index = this.data.scheduled.findIndex((s) => s.id === item.id);
    if (index >= 0) this.data.scheduled[index] = item;
    else this.data.scheduled.push(item);
    void this.save();
  }

  /** Elimina la programación de la lista (canceladas no se conservan). */
  removeScheduled(id: string): boolean {
    const index = this.data.scheduled.findIndex((s) => s.id.toLowerCase() === id.toLowerCase());
    if (index < 0) return false;
    this.data.scheduled.splice(index, 1);
    void this.save();
    return true;
  }

  // ----------------------------------------------------------------- Audit
  audit(action: string, detail: string, actor = 'sistema'): void {
    const entry: AuditEntry = {
      id: shortId('a_'),
      action,
      detail,
      actor,
      timestamp: Date.now(),
    };
    this.data.audit.unshift(entry);
    this.data.audit = this.data.audit.slice(0, 300);
    void this.save();
  }

  listAudit(limit = 15): AuditEntry[] {
    return this.data.audit.slice(0, limit);
  }

  /**
   * Total histórico de envíos de una campaña según la auditoría.
   * Se usa como respaldo para campañas creadas antes de existir `totalSent`.
   */
  countAuditSends(campaignId: string): number {
    const manual = `${campaignId} enviada a `;
    const automatic = `${campaignId} enviada automáticamente (`;
    let total = 0;
    for (const entry of this.data.audit) {
      if (entry.action !== 'campana.send' && entry.action !== 'campana.programada') continue;
      if (entry.detail.startsWith(manual)) {
        total += Number.parseInt(entry.detail.slice(manual.length), 10) || 0;
      } else if (entry.detail.startsWith(automatic)) {
        total += Number.parseInt(entry.detail.slice(automatic.length), 10) || 0;
      }
    }
    return total;
  }

  // --------------------------------------------------------------- Settings
  get settings(): StoreData['settings'] {
    return this.data.settings;
  }

  updateSettings(patch: Partial<StoreData['settings']>): void {
    this.data.settings = { ...this.data.settings, ...patch };
    void this.save();
  }

  /** Reinicia el contador diario de todos los grupos si cambió el día. */
  refreshDailyCounters(): void {
    const today = new Date().toDateString();
    for (const group of Object.values(this.data.groups)) {
      const last = group.lastSentAt ? new Date(group.lastSentAt).toDateString() : '';
      if (last !== today && group.sendsToday !== 0) {
        group.sendsToday = 0;
      }
    }
  }

  /** Escritura atómica encolada para evitar escrituras concurrentes. */
  save(): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      const tmp = `${config.paths.dataFile}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(this.data, null, 2), 'utf8');
      await fs.rename(tmp, config.paths.dataFile);
    }).catch((err) => {
      console.error('[Store] Error al guardar:', err);
    });
    return this.writeQueue;
  }

  /** Crea un respaldo fechado del almacén. */
  async backup(): Promise<string> {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(config.paths.dataDir, `db.backup-${stamp}.json`);
    await fs.copyFile(config.paths.dataFile, dest);
    return dest;
  }
}

export const store = new Store();
