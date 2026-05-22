'use client'

import { SignUp } from "@clerk/nextjs"
import Image from "next/image"

export default function SignUpPage() {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-(--auth-bg-deep) text-(--text-primary)">
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

      <section className="relative hidden min-h-screen overflow-hidden lg:block lg:w-[52%]">
        <Image unoptimized
          src="/auth_ui.png"
          alt=""
          fill
          priority
          sizes="52vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-(--auth-image-scrim)" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(90deg,transparent,var(--auth-bg-deep))]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,var(--auth-bg-deep))]" />

        <div className="absolute bottom-14 left-14 max-w-lg">
          <p className="mb-4 text-sm font-medium uppercase text-(--accent-secondary)">
            Agentic architecture workspace
          </p>
          <h1 className="mb-5 bg-[linear-gradient(135deg,var(--text-primary),var(--accent-secondary),var(--accent-purple))] bg-clip-text text-5xl font-semibold leading-tight text-transparent [text-shadow:0_0_24px_var(--accent-glow-cyan)]">
            Nexus AI
          </h1>
          <p className="max-w-md text-lg font-medium leading-relaxed text-(--text-secondary)">
            Collaborative agentic planning for teams designing live systems together.
          </p>
        </div>
      </section>

      <section className="relative z-10 flex w-full items-center justify-center px-6 py-10 md:px-12 lg:w-[48%] lg:bg-[radial-gradient(circle_at_50%_0%,var(--accent-primary-muted),transparent_34%),linear-gradient(135deg,var(--auth-bg-midnight),var(--bg-base)_56%,var(--auth-bg-deep))]">
        <div className="flex w-full max-w-110 flex-col items-center">
          <Image unoptimized
            src="/logo.png"
            alt="Nexus"
            width={1254}
            height={1254}
            className="mb-7 size-24 object-contain drop-shadow-[0_0_24px_var(--accent-glow-cyan)] md:size-28"
          />

          <div className="w-full rounded-xl bg-[linear-gradient(135deg,var(--border-accent),var(--accent-purple-muted),var(--border-subtle))] p-px shadow-(--shadow-glow-cyan)">
            <div className="rounded-xl bg-(--auth-card-bg) p-3 backdrop-blur-xl">
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
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
                rootBox: "w-full",
                card: "w-full border-0 bg-transparent shadow-none",
                headerTitle:
                  "text-2xl font-semibold text-(--text-primary) [text-shadow:0_0_18px_var(--accent-glow-cyan)]",
                headerSubtitle:
                  "text-(--text-secondary)",
                socialButtonsBlockButton:
                  "border border-black bg-black text-(--text-primary) transition-all duration-200 hover:border-[#3b82f6]",
                formFieldInput:
                  "border border-[var(--border-default)] bg-[var(--bg-subtle)] text-(--text-primary) transition-all duration-200 focus:border-[var(--border-accent)] focus:shadow-(--shadow-glow-cyan)",
                formFieldLabel: "text-(--text-secondary)",
                footerActionLink: "text-[var(--accent-primary)]",
                formButtonPrimary:
                  "bg-[linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))] text-[var(--text-inverted)] shadow-(--shadow-glow-cyan) transition-all duration-200 hover:shadow-[var(--shadow-glow)]",
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
