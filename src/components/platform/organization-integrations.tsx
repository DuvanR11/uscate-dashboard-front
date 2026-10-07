'use client';
import { QuerySection } from './query-section';
import { WhatsappMetaDialog } from './whatsapp-meta-dialog';
import { SocialMetaDialog } from './social-meta-dialog';
import { LegislativeBodyDialog } from './legislative-body-dialog';
import { listLegislativeBodies, type PlatformOrganization } from '@/lib/api/platform';

export function OrganizationIntegrations({ org, canWrite, refresh }: { org: PlatformOrganization; canWrite: boolean; refresh: () => void }) {
  return <div className="space-y-4">
    <section className="rounded-xl border p-5 space-y-2"><h2 className="font-semibold">WhatsApp oficial</h2><p>{org.whatsappMeta?.displayPhoneNumber ?? 'Sin número conectado'}</p>{canWrite && <WhatsappMetaDialog organization={org} onChanged={refresh} />}</section>
    <section className="rounded-xl border p-5 space-y-2"><h2 className="font-semibold">Facebook e Instagram</h2><p>{org.socialMeta?.pageName ?? 'Sin cuenta conectada'}</p>{org.socialMeta?.instagramUsername && <p>{org.socialMeta.instagramUsername}</p>}{canWrite && <SocialMetaDialog organization={org} onChanged={refresh} />}</section>
    <QuerySection title="Radar legislativo" load={listLegislativeBodies}>{(bodies) => <><p>{bodies.find((body) => body.code === org.legislativeBodyId)?.name ?? 'Sin corporación seleccionada'}</p>{canWrite && <LegislativeBodyDialog organization={org} legislativeBodies={bodies} onChanged={refresh} />}</>}</QuerySection>
  </div>;
}
