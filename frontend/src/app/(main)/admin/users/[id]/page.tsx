'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { UserForm, BrukerFormValues } from '@/components/users/user-form'
import { useBruker, useCreateBruker, useUpdateBruker } from '@/hooks/useBrukere'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function UserEditPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const isNew = userId === 'new'

  const { data: bruker, isLoading } = useBruker(
    isNew ? undefined : parseInt(userId)
  )
  const createMutation = useCreateBruker()
  const updateMutation = useUpdateBruker()

  const handleSubmit = (formData: BrukerFormValues) => {
    const data = {
      ...formData,
      ansattid: formData.ansattid ?? undefined,
    }

    if (isNew) {
      createMutation.mutate(data as any, {
        onSuccess: () => {
          router.push('/admin/users')
        },
      })
    } else {
      updateMutation.mutate(
        { id: parseInt(userId), data },
        {
          onSuccess: () => {
            router.push('/admin/users')
          },
        }
      )
    }
  }

  const handleCancel = () => {
    router.push('/admin/users')
  }

  if (!isNew && isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake til brukere
            </Link>
          </Button>
        </div>
        <div>Laster...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake til brukere
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">
          {isNew ? 'Opprett ny bruker' : 'Rediger bruker'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isNew
            ? 'Fyll inn informasjon for den nye brukeren'
            : 'Oppdater informasjon om brukeren'}
        </p>
      </div>

      <div className="max-w-2xl">
        <UserForm
          bruker={bruker}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    </div>
  )
}
