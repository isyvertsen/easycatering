'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { nb } from 'date-fns/locale'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreVertical, Pencil, Copy, Trash2, Printer, Globe, User } from 'lucide-react'
import type { LabelTemplate } from '@/types/labels'

interface TemplateCardProps {
  template: LabelTemplate
  onDelete?: (id: number) => void
  onDuplicate?: (template: LabelTemplate) => void
}

export function TemplateCard({ template, onDelete, onDuplicate }: TemplateCardProps) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleCardClick = () => {
    router.push(`/labels/${template.id}`)
  }

  const handleDelete = () => {
    onDelete?.(template.id)
    setShowDeleteDialog(false)
  }

  const formattedDate = template.updated_at
    ? formatDistanceToNow(new Date(template.updated_at), { addSuffix: true, locale: nb })
    : formatDistanceToNow(new Date(template.created_at), { addSuffix: true, locale: nb })

  return (
    <>
      <Card className="group hover:shadow-md transition-shadow cursor-pointer" onClick={handleCardClick}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{template.name}</CardTitle>
              <CardDescription className="text-xs mt-1">
                {template.width_mm} x {template.height_mm} mm
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem asChild>
                  <Link href={`/labels/${template.id}`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rediger
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/labels/${template.id}/print`}>
                    <Printer className="h-4 w-4 mr-2" />
                    Skriv ut
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate?.(template)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Dupliser
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Slett
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pb-2">
          {/* Thumbnail or placeholder */}
          <div className="aspect-[2/1] bg-muted rounded-md flex items-center justify-center mb-2">
            {template.thumbnail_url ? (
              <img
                src={template.thumbnail_url}
                alt={template.name}
                className="object-contain w-full h-full rounded-md"
              />
            ) : (
              <div className="text-muted-foreground text-sm">Ingen forhåndsvisning</div>
            )}
          </div>

          {template.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {template.description}
            </p>
          )}
        </CardContent>

        <CardFooter className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formattedDate}</span>
          <span className="flex items-center gap-1">
            {template.is_global ? (
              <>
                <Globe className="h-3 w-3" />
                Global
              </>
            ) : (
              <>
                <User className="h-3 w-3" />
                Privat
              </>
            )}
          </span>
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett mal</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette malen "{template.name}"? Denne handlingen
              kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
