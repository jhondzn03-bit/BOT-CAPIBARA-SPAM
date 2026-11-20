import { store } from '../storage/Store';
import type { Campaign, CampaignContent, CampaignType } from '../types';
import { shortId } from '../utils/helpers';

export class CampaignService {
  create(type: CampaignType, content: CampaignContent, name?: string): Campaign {
    const campaign: Campaign = {
      id: shortId('c_'),
      name: name ?? `${type} ${new Date().toLocaleDateString('es-MX')}`,
      type,
      content,
      status: 'borrador',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    store.upsertCampaign(campaign);
    store.audit('campana.create', `Creada ${campaign.id} (${type})`, 'sistema');
    return campaign;
  }

  /** Guarda/renombra una campaña existente. */
  save(id: string, name: string): Campaign | undefined {
    const campaign = store.getCampaign(id);
    if (!campaign) return undefined;
    campaign.name = name;
    campaign.status = 'guardada';
    campaign.updatedAt = Date.now();
    store.upsertCampaign(campaign);
    store.audit('campana.save', `${campaign.id} -> ${name}`, 'sistema');
    return campaign;
  }

  edit(id: string, text: string, asCaption = false): Campaign | undefined {
    const campaign = store.getCampaign(id);
    if (!campaign) return undefined;
    if (asCaption && campaign.content.mediaPath) campaign.content.caption = text;
    else campaign.content.text = text;
    campaign.updatedAt = Date.now();
    store.upsertCampaign(campaign);
    store.audit('campana.edit', `Editada ${campaign.id}`, 'sistema');
    return campaign;
  }

  markSent(id: string, count: number): void {
    const campaign = store.getCampaign(id);
    if (!campaign) return;
    campaign.status = 'enviada';
    campaign.sentAt = Date.now();
    campaign.sentCount = count;
    campaign.totalSent = (campaign.totalSent ?? store.countAuditSends(id)) + count;
    campaign.updatedAt = Date.now();
    store.upsertCampaign(campaign);
    store.audit('campana.send', `${campaign.id} enviada a ${count} grupos`, 'sistema');
  }

  remove(id: string): boolean {
    const removed = store.removeCampaign(id);
    if (removed) store.audit('campana.remove', `Eliminada ${id}`, 'sistema');
    return removed;
  }

  /** Última campaña creada (útil para responder con guardar/editar). */
  latest(): Campaign | undefined {
    return store.listCampaigns()[0];
  }
}

export const campaigns = new CampaignService();
