'use client'
import React from 'react'
import { useOrg } from '@components/Contexts/OrgContext'
import { JsonLd } from '@components/SEO/JsonLd'
import { getUriWithOrg } from '@services/config/config'
import { getOrgLogoMediaDirectory } from '@services/media/media'
import CoreTraceWorkspace from '@components/CoreTrace/CoreTraceWorkspace'

export default function HomeClient({ orgslug }: { orgslug: string }) {
  const org = useOrg() as any

  const orgJsonLd = org
    ? {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: org.name,
        description: org.description,
        url: getUriWithOrg(org?.slug || orgslug, '/'),
        ...(org.logo_image && {
          logo: getOrgLogoMediaDirectory(org.org_uuid, org.logo_image),
        }),
      }
    : null

  return (
    <div className="w-full">
      {orgJsonLd && <JsonLd data={orgJsonLd} />}
      <CoreTraceWorkspace orgslug={orgslug} org={org} />
    </div>
  )
}
