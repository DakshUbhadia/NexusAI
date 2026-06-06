'use client'

import { SignIn } from "@clerk/nextjs"
import Image from "next/image"

export default function SignInPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-(--auth-bg-deep) text-(--text-primary) lg:grid lg:grid-cols-[minmax(0,13fr)_minmax(0,7fr)]">
      <div className="absolute inset-0 lg:hidden">
        <Image unoptimized
          src="/auth_ui.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--accent-primary-muted),transparent_38%),linear-gradient(180deg,var(--auth-bg-midnight),var(--auth-bg-deep))]" />
      </div>

      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <div className="absolute inset-0">
          <Image
            unoptimized
            src="/auth_ui.png"
            alt=""
            fill
            priority
            sizes="65vw"
            className="object-cover object-[center_top]"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--auth-bg-midnight)_8%,rgba(7,7,14,0.08)_42%,rgba(7,7,14,0.44)_100%)]" />
        <div className="absolute inset-y-0 right-0 w-56 bg-[linear-gradient(90deg,transparent,var(--auth-bg-deep))]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,var(--auth-bg-deep))]" />

        <div className="absolute inset-0 flex flex-col justify-between p-8">
          <div className="bg-[linear-gradient(135deg,var(--accent-primary),var(--accent-secondary),var(--border-accent))] bg-clip-text text-2xl font-bold text-transparent drop-shadow-[0_0_24px_var(--accent-glow-cyan)]">
              Nexus AI
          </div>

          <div className="max-w-2xl">
            <h1 className="mb-4 text-4xl font-bold leading-tight text-(--text-primary)">
              Design systems at the speed of thought.
            </h1>
            <p className="mb-8 max-w-lg text-base text-(--text-secondary)">
              Describe your architecture in plain English. Nexus AI maps it to a shared canvas your whole team can refine in real time.
            </p>

            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-(--accent-primary)/20 text-(--accent-primary)">
                  <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="mb-0.5 text-sm font-semibold text-(--text-primary)">AI Architecture Generation</h3>
                  <p className="text-xs text-(--text-secondary)">Describe your system, AI maps it to nodes and edges on a live canvas.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-(--accent-primary)/20 text-(--accent-primary)">
                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="mb-0.5 text-sm font-semibold text-(--text-primary)">Real-time Collaboration</h3>
                  <p className="text-xs text-(--text-secondary)">Live cursors, presence indicators, and shared node editing across your team.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-(--accent-primary)/20 text-(--accent-primary)">
                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="mb-0.5 text-sm font-semibold text-(--text-primary)">Instant Spec Generation</h3>
                  <p className="text-xs text-(--text-secondary)">Export a complete Markdown technical spec directly from the canvas graph.</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-(--text-secondary))">© 2026 Nexus AI. All rights reserved.</p>
        </div>
      </section>

      <section className="relative z-10 flex w-full items-center justify-center px-6 py-4 md:px-12 lg:min-w-0 lg:justify-start lg:bg-[linear-gradient(135deg,var(--auth-bg-deep),var(--auth-bg-midnight)_18%,var(--bg-base)_100%)] lg:px-8 lg:pl-10 xl:pl-12">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-[linear-gradient(90deg,var(--bg-base),transparent)] lg:w-32" />
        <div className="relative flex w-full max-w-[24rem] flex-col items-center lg:max-w-84 xl:max-w-96">
          <Image unoptimized
            src="/logo.png"
            alt="Nexus"
            width={1254}
            height={1254}
            className="mb-4 size-20 object-contain drop-shadow-[0_0_24px_var(--accent-glow-cyan)] md:size-24"
          />

          <div className="inline-block overflow-hidden rounded-xl bg-[linear-gradient(135deg,var(--border-accent),var(--accent-purple-muted),var(--border-subtle))] p-px shadow-(--shadow-glow-cyan)">
            <div className="overflow-hidden rounded-xl bg-(--auth-card-bg) px-4 py-5 backdrop-blur-xl">
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            appearance={{
              variables: {
                borderRadius: "var(--radius-md)",
                colorBackground: "transparent",
                colorForeground: "var(--text-primary)",
                colorInput: "var(--bg-subtle)",
                colorInputForeground: "var(--text-primary)",
                colorPrimary: "var(--accent-primary)",
                colorPrimaryForeground: "var(--text-inverted)",
                colorMutedForeground: "var(--text-secondary)",
                colorBorder: "var(--border-default)",
                colorRing: "var(--accent-primary)",
                fontFamily: "var(--font-sans)",
              },
              elements: {
                rootBox: "w-full [&_form]:gap-3 [&_form]:space-y-3",
                card: "w-full border-0 bg-transparent shadow-none",
                headerTitle:
                  "text-2xl font-semibold text-(--text-primary) [text-shadow:0_0_18px_var(--accent-glow-cyan)]",
                headerSubtitle:
                  "text-(--text-secondary)",
                socialButtonsBlockButton:
                  "w-full border border-black bg-black text-(--text-primary) transition-all duration-200 hover:border-[#3b82f6]",
                formFieldInput:
                  "border border-[var(--border-default)] bg-[var(--bg-subtle)] text-(--text-primary) transition-all duration-200 focus:border-[var(--border-accent)] focus:shadow-(--shadow-glow-cyan)",
                formFieldLabel: "text-(--text-secondary)",
                footerActionLink: "text-[var(--accent-primary)]",
                footer: "mt-4 bg-transparent",
                formButtonPrimary:
                  "mt-2 bg-[linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))] text-[var(--text-inverted)] shadow-(--shadow-glow-cyan) transition-all duration-200 hover:shadow-[var(--shadow-glow)]",
                buttonPrimary:
                  "bg-[linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))] text-[var(--text-inverted)] shadow-(--shadow-glow-cyan) transition-all duration-200 hover:shadow-[var(--shadow-glow)]",
              },
            }}
          />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}