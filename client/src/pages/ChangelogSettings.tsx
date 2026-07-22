import { History } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type ChangelogSection = {
  page: string;
  changes: string[];
};

type ChangelogEntry = {
  version: string;
  date: string;
  sections: ChangelogSection[];
};

const CHANGELOG: ChangelogEntry[] = [
  // Copy this entire block when adding a new update:
  /*
  {
    version: "1.0.2",
    date: "Month Day, Year",
    sections: [
      {
        page: "Page Name",
        changes: [
          "First change.",
          "Second change.",
          "Third change.",
        ],
      },
    ],
  },
  */
  {
    version: "1.0.1",
    date: "July 22, 2026",
    sections: [
      {
        page: "App & Performance",
        changes: [
          "Improved how LineUp checks for updates when the app opens.",
          "Reduced startup time and improved general page loading speed.",
        ],
      },
      {
        page: "Onboarding",
        changes: [
          "The “Do not show again” preference is now saved to your account.",
          "The walkthrough no longer returns after signing out and back in.",
          "The App Walkthrough can still be reopened manually from Settings.",
        ],
      },
      {
        page: "Install LineUp",
        changes: [
          "Redesigned the mobile install prompt.",
          "Added clearer instructions to install LineUp to your Home Screen.",
          "Added instructions based on the user’s device and browser.",
          "Updated the LineUp branding, spacing, buttons, and typography.",
        ],
      },
      {
        page: "Calendar & Sessions",
        changes: [
          "Updated the New Session and Edit Session layout.",
          "Improved the size and consistency of Library entries inside a session.",
          "Refined selected dance controls and quantity buttons.",
          "Updated colors, spacing, borders, and search fields.",
        ],
      },
      {
        page: "Settings",
        changes: [
          "Added a Changelog page.",
          "Added version dropdowns so previous updates can be reviewed.",
        ],
      },
    ],
  },
  {
    version: "1.0.0",
    date: "July 17, 2026 — Initial Release",
    sections: [
      {
        page: "Recap",
        changes: [
          "View your overall dance statistics in one place.",
          "Track totals such as dances, sessions, locations, streaks, and averages.",
          "See your most danced songs, dances, styles, and locations.",
          "Customize which stat cards appear on your Recap page.",
          "Review your LineUp summary in a wrapped-style format.",
        ],
      },
      {
        page: "Calendar & Sessions",
        changes: [
          "Create dance sessions for specific dates.",
          "Add a venue or location to each session.",
          "Select line dances and swing songs from your Library.",
          "Track how many times each dance or song was completed during a session.",
          "Edit or delete previously saved sessions.",
          "View all logged sessions from the Calendar.",
        ],
      },
      {
        page: "Library",
        changes: [
          "Build a personal Library of line dances and swing songs.",
          "Store dance names, song names, artists, styles, and ratings.",
          "Separate your Library by Line, Swing, or All.",
          "Search by dance name, song name, or artist.",
          "Mark favorite dances and songs for quicker access.",
          "Add new Library entries while creating or editing a session.",
        ],
      },
      {
        page: "Crew",
        changes: [
          "Search for other LineUp users.",
          "Send, accept, and decline Crew requests.",
          "View members of your Crew.",
          "Open public profiles to compare dance statistics.",
          "See suggested dancers based on nearby or shared locations.",
          "Remove Crew members when needed.",
        ],
      },
      {
        page: "Challenges & Showdowns",
        changes: [
          "Challenge Crew members to dance competitions.",
          "Create head-to-head challenges or group Showdowns.",
          "Join Showdowns using a shared join code.",
          "Track participant progress and final results.",
          "Review completed challenges and Showdowns.",
        ],
      },
      {
        page: "Buckles",
        changes: [
          "Unlock achievements as you log more dances and sessions.",
          "Earn Buckles for milestones, consistency, exploration, variety, and social activity.",
          "Track progress toward locked achievements.",
          "View newly earned Buckles when they are unlocked.",
        ],
      },
      {
        page: "Profile",
        changes: [
          "Create a personal LineUp profile.",
          "Set your name, username, avatar, phone number, and location.",
          "View your public dance statistics.",
          "Control whether you appear in Suggested Crew.",
        ],
      },
      {
        page: "Settings",
        changes: [
          "Switch between light and dark themes.",
          "Replay the App Walkthrough.",
          "Manage location privacy settings.",
          "Download CSV templates for bulk Library imports.",
          "Import line dances and swing songs from completed CSV templates.",
          "Delete session, Library, or account data from the Danger Zone.",
        ],
      },
      {
        page: "App Experience",
        changes: [
          "Install LineUp on a supported mobile device for a full-screen app experience.",
          "Open LineUp directly from your Home Screen.",
          "Receive new features and fixes without downloading app-store updates.",
        ],
      },
    ],
  },
];

export default function ChangelogSettings() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-5">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <History className="h-5 w-5" />
          </div>

          <div>
            <h1 className="font-display text-3xl font-bold text-primary">
              Changelog
            </h1>

            <p className="text-sm text-muted-foreground">
              See what’s new in LineUp.
            </p>
          </div>
        </div>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {CHANGELOG.map((entry) => (
          <AccordionItem
            key={`${entry.version}-${entry.date}`}
            value={`version-${entry.version}`}
            className="overflow-hidden rounded-2xl border border-border bg-card px-0 shadow-sm"
          >
            <AccordionTrigger className="px-5 py-4 text-left hover:no-underline">
              <span className="pr-3 font-semibold text-foreground">
                {entry.version} - {entry.date}
              </span>
            </AccordionTrigger>

            <AccordionContent className="px-5 pb-5">
              <div className="space-y-5">
                {entry.sections.map((section) => (
                  <section key={`${entry.version}-${section.page}`}>
                    <h3 className="mb-2 font-semibold text-foreground">
                      {section.page}
                    </h3>

                    <ul className="space-y-2">
                      {section.changes.map((change, changeIndex) => (
                        <li
                          key={`${entry.version}-${section.page}-${changeIndex}`}
                          className="flex gap-3 text-sm leading-6 text-muted-foreground"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                          />
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}