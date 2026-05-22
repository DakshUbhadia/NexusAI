'use client'

import { useState } from 'react'
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"

export default function EditorPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <EditorNavbar
        isOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      <ProjectSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="min-h-screen bg-background pt-(--topbar-height) p-8 text-foreground">
        <section className="mx-auto flex max-w-3xl flex-col gap-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Nexus AI</p>
            <h1 className="text-2xl font-semibold tracking-normal">
              Design system foundation
            </h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Primitive smoke test</CardTitle>
              <CardDescription>
                Core shadcn/ui components rendered against the Nexus dark theme.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Tabs defaultValue="prompt">
                <TabsList>
                  <TabsTrigger value="prompt">Prompt</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="prompt" className="flex flex-col gap-3">
                  <Input placeholder="Project name" />
                  <Textarea placeholder="Describe the system you want to design" />
                </TabsContent>
                <TabsContent value="settings">
                  <ScrollArea className="h-24 rounded-md border p-3 text-sm text-muted-foreground">
                    Dark-only theme tokens, Radix primitives, Lucide icons, and
                    Tailwind class merging are ready for feature work.
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              <div className="flex items-center gap-3">
                <Button>
                  <Sparkles />
                  Generate
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Open dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nexus dialog</DialogTitle>
                      <DialogDescription>
                        Dialog styling is mapped to the shared dark theme tokens.
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  )
}
