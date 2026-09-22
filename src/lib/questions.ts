export type QuestionType =
  | "short"
  | "long"
  | "single"
  | "multi"
  | "dropdown"
  | "rank"
  | "phone";

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  hint?: string;
  placeholder?: string;
  options?: string[];
  /** Adds an "Other / Something else" option with a free-text box */
  other?: string;
  /** For multi: max selections. For rank: how many to rank. */
  max?: number;
  optional?: boolean;
  /** Only show when another answer matches. */
  showIf?: { id: string; equals?: string; oneOf?: string[] };
}

export interface Section {
  id: string;
  title: string;
  intro?: string;
  mascot: "smiling" | "thinking" | "laughing" | "shock" | "chill";
  questions: Question[];
}

export const OTHER_PREFIX = "Other: ";
export const STOPPED_USING = "I've basically stopped using it";

export const sections: Section[] = [
  {
    id: "you",
    title: "Let's start with you",
    intro: "Just enough to picture your world.",
    mascot: "smiling",
    questions: [
      {
        id: "q1",
        type: "short",
        label: "First things first, what should we call you?",
        placeholder: "Your name",
      },
      {
        id: "q2",
        type: "dropdown",
        label: "Which city do you spend most of your week in?",
        options: [
          "Bengaluru",
          "Mumbai",
          "Delhi NCR",
          "Hyderabad",
          "Pune",
          "Chennai",
          "Kolkata",
          "Ahmedabad",
          "Jaipur",
          "Chandigarh",
        ],
        other: "Other",
      },
      {
        id: "q3",
        type: "single",
        label: "Which of these sounds most like your life right now?",
        options: [
          "In college and making the most of it",
          "First few years of work, still figuring out the city",
          "Settled into work, and weekends are sacred",
          "Running my own thing / freelancing",
          "Taking a break or between things",
        ],
        other: "Something else",
      },
      {
        id: "q4",
        type: "single",
        label: "And who's at home with you?",
        options: ["Family", "Flatmates", "PG or hostel", "Partner", "Just me"],
      },
    ],
  },
  {
    id: "deciding",
    title: "Forget Gobi for a minute",
    intro: "We want to understand how you actually decide where to go.",
    mascot: "thinking",
    questions: [
      {
        id: "q5",
        type: "short",
        label:
          "Think of the last time you went somewhere new: a café, restaurant, bar, event, anything. What was it, and roughly when?",
        placeholder: 'e.g. "A new Korean place in HSR, last Friday"',
      },
      {
        id: "q6",
        type: "long",
        label: "How did you choose that place? Tell us what happened, step by step.",
        hint: "Who said \"let's go out\"? Where did you look for places? Why did you pick this one?",
      },
      {
        id: "q7",
        type: "single",
        label: "In that story, who actually made the final call?",
        options: [
          "Me",
          "A friend",
          "My partner or date",
          "The WhatsApp group (after 47 messages)",
          "Whoever was the loudest",
          "Nobody, we just walked in",
        ],
      },
      {
        id: "q8",
        type: "multi",
        max: 3,
        label: "Where do ideas for new places usually come from for you?",
        hint: "Pick up to 3.",
        options: [
          "Instagram reels or posts",
          "Friends' recommendations or WhatsApp groups",
          "Google Maps",
          "Zomato, Swiggy Dineout, or District",
          "YouTube or food and travel creators",
          "Walking or driving past it",
          "Gobi",
        ],
        other: "Something else",
      },
      {
        id: "q9",
        type: "single",
        label: "What's the most annoying part of figuring out where to go?",
        options: [
          "Too many options, I can't decide",
          "Ratings and reviews feel fake or useless",
          "Places look way better online than in real life",
          "Getting the group to agree",
          "Not knowing what's happening near me right now",
          "Finding something that fits my budget",
          "Honestly, it's not a problem for me",
        ],
        other: "Something else",
      },
      {
        id: "q10",
        type: "single",
        label: "How often do you go somewhere new (not your usual spots)?",
        options: [
          "Multiple times a week",
          "About once a week",
          "A couple of times a month",
          "Once a month or less",
        ],
      },
    ],
  },
  {
    id: "gobi-enters",
    title: "Okay, now Gobi enters the story",
    mascot: "laughing",
    questions: [
      {
        id: "q11",
        type: "single",
        label: "How did Gobi first land on your phone?",
        options: [
          "A friend told me about it",
          "Someone sent me a Gobi link",
          "Saw an ad on Instagram or YouTube",
          "Saw a creator or reel talking about it",
          "Found it on the App Store / Play Store",
          "Through my college or workplace",
          "I genuinely don't remember",
        ],
        other: "Something else",
      },
      {
        id: "q12",
        type: "short",
        label: "What were you hoping Gobi would do for you when you downloaded it?",
        hint: 'Totally fine if the answer is "no idea, the ad looked cool".',
      },
      {
        id: "q13",
        type: "single",
        label: "And did it live up to that?",
        options: [
          "Yes, and then some",
          "Mostly",
          "Kind of, but it wasn't what I expected",
          "Not really",
        ],
      },
      {
        id: "q14",
        type: "single",
        label: "Be honest: how often do you open Gobi these days?",
        options: [
          "Almost every day",
          "A few times a week",
          "A few times a month",
          "Only when I'm planning to go out",
          STOPPED_USING,
        ],
      },
      {
        id: "qa1",
        type: "single",
        label: "Every breakup has a reason. What's closest to yours?",
        showIf: { id: "q14", equals: STOPPED_USING },
        options: [
          "Didn't find places I actually liked",
          "Not enough places or activity in my area",
          "My friends aren't on it",
          "Went back to Instagram / Google Maps / WhatsApp",
          "The app was slow, glitchy, or confusing",
          "Never really understood what to do with it",
          "Just forgot it existed",
        ],
        other: "Something else",
      },
      {
        id: "qa2",
        type: "short",
        label: "What would Gobi have to change for you to give it another shot?",
        showIf: { id: "q14", equals: STOPPED_USING },
      },
    ],
  },
  {
    id: "fit",
    title: "How Gobi fits into your plans",
    intro: "Let's get specific.",
    mascot: "chill",
    questions: [
      {
        id: "q15",
        type: "single",
        label: "Think of the last time you opened Gobi. What were you trying to do?",
        options: [
          "Find somewhere to go right now",
          "Plan something for later (weekend, date, birthday)",
          "Just browsing, killing time",
          "Look up a specific place I'd heard about",
          "See what events are happening",
          "See what friends or people I follow are into",
        ],
        other: "Something else",
      },
      {
        id: "q16",
        type: "single",
        label: "Has Gobi ever actually got you to go somewhere?",
        options: [
          "Yes, many times",
          "Once or twice",
          "I've saved places but haven't gone yet",
          "No",
        ],
      },
      {
        id: "q16b",
        type: "long",
        label: "Tell us about one. Where did you go, and what on Gobi convinced you?",
        showIf: { id: "q16", oneOf: ["Yes, many times", "Once or twice"] },
      },
      {
        id: "q17",
        type: "rank",
        max: 3,
        label:
          "Plot twist: Gobi has to delete everything except 3 things. Rank what you'd fight to keep.",
        hint: "Tap your top pick first, then your second, then your third.",
        options: [
          "Videos of places",
          "Exploring the map to see what's near me",
          "Search",
          "Ask Gobi (AI)",
          "Events",
          "Seeing what friends and people I follow like",
          "Sharing places with friends",
          "Saving places for later",
        ],
      },
      {
        id: "q18",
        type: "long",
        label:
          "Now the opposite: what's something on Gobi you've never used, or tried once and never again? Why?",
      },
      {
        id: "q19",
        type: "single",
        label: "When Gobi doesn't have what you need, where do you go instead?",
        options: [
          "Instagram",
          "Google Maps",
          "Zomato or District",
          "I ask a friend",
          "I give up and go to my usual place",
        ],
        other: "Something else",
      },
    ],
  },
  {
    id: "honest",
    title: "This is the section we care about most",
    intro: "Please don't be polite.",
    mascot: "shock",
    questions: [
      {
        id: "q20",
        type: "single",
        label:
          "How would you feel if you could no longer use Gobi, starting tomorrow?",
        options: [
          "Very disappointed",
          "Somewhat disappointed",
          "Not disappointed, it isn't that useful to me",
          "I don't really use it anyway",
        ],
      },
      {
        id: "q21",
        type: "long",
        label: "What exactly would you miss, or not miss?",
      },
      {
        id: "q22",
        type: "short",
        label:
          "Explain Gobi to a friend who's never heard of it, in one WhatsApp message.",
        hint: "Write it exactly how you'd send it.",
      },
      {
        id: "q23",
        type: "short",
        label: "What kind of person do you think would love Gobi the most? Describe them.",
      },
      {
        id: "q24",
        type: "short",
        label:
          "What's the one thing that would turn Gobi into something you couldn't live without?",
      },
    ],
  },
  {
    id: "crew",
    title: "Tell us about your crew",
    intro: "Going out is rarely a solo sport.",
    mascot: "laughing",
    questions: [
      {
        id: "q25",
        type: "multi",
        max: 2,
        label: "Who do you usually go out with?",
        hint: "Pick up to 2.",
        options: [
          "College friends",
          "Work friends",
          "Partner or dates",
          "Family",
          "Solo",
          "New people (meetups, events, communities)",
        ],
      },
      {
        id: "q26",
        type: "single",
        label: "Have you ever sent a place from Gobi to someone?",
        options: [
          "Yes, often",
          "Once or twice",
          "No, I screenshot or send an Instagram / Google Maps link instead",
          "No, never",
        ],
      },
      {
        id: "q27",
        type: "single",
        label: "Have you told anyone about Gobi?",
        options: [
          "Yes, I already have",
          "Not yet, but I would if it came up",
          "Probably not",
          "No",
        ],
      },
    ],
  },
  {
    id: "about",
    title: "Almost done!",
    intro: "A few quick ones so we understand who you are.",
    mascot: "smiling",
    questions: [
      {
        id: "q28",
        type: "single",
        label: "Your age?",
        options: ["18–21", "22–25", "26–30", "31–35", "36+"],
      },
      {
        id: "q29",
        type: "single",
        label: "Your gender?",
        hint: "Optional.",
        optional: true,
        options: ["Woman", "Man", "Non-binary", "Prefer not to say"],
      },
      {
        id: "q30",
        type: "single",
        label:
          "In a typical month, roughly how much do you personally spend on eating out, cafés, bars, and events?",
        options: [
          "Under ₹1,000",
          "₹1,000–3,000",
          "₹3,000–7,000",
          "₹7,000–15,000",
          "Above ₹15,000",
          "Prefer not to say",
        ],
      },
      {
        id: "q31",
        type: "multi",
        max: 3,
        label: "Which apps could you absolutely not live without?",
        hint: "Pick up to 3.",
        options: [
          "Instagram",
          "WhatsApp",
          "YouTube",
          "Snapchat",
          "Spotify",
          "Zomato",
          "Swiggy",
          "Blinkit / Zepto",
          "Google Maps",
          "LinkedIn",
          "Bumble / Hinge",
        ],
        other: "Other",
      },
      {
        id: "q32",
        type: "single",
        label: "Would you be up for a 20-minute chat with the Gobi team?",
        hint: "It helps us more than you know.",
        options: ["Yes, WhatsApp me", "Not this time"],
      },
      {
        id: "whatsapp",
        type: "phone",
        label: "Your WhatsApp number",
        hint: "So we can send your ₹500 voucher. We won't use it for anything else.",
        placeholder: "10-digit mobile number",
      },
    ],
  },
];

export const allQuestions: Question[] = sections.flatMap((s) => s.questions);

export type Answers = Record<string, string | string[] | undefined>;

export function isVisible(q: Question, answers: Answers): boolean {
  if (!q.showIf) return true;
  const v = answers[q.showIf.id];
  if (typeof v !== "string") return false;
  if (q.showIf.equals !== undefined) return v === q.showIf.equals;
  if (q.showIf.oneOf) return q.showIf.oneOf.includes(v);
  return true;
}

export function isAnswered(q: Question, answers: Answers): boolean {
  const v = answers[q.id];
  if (v === undefined) return false;
  if (Array.isArray(v)) {
    if (v.length === 0) return false;
    if (q.type === "rank") return v.length === (q.max ?? 3);
    return v.every((x) => !x.startsWith(OTHER_PREFIX) || x.length > OTHER_PREFIX.length);
  }
  const s = v.trim();
  if (!s) return false;
  if (s.startsWith(OTHER_PREFIX)) return s.length > OTHER_PREFIX.length;
  if (q.type === "phone") return /^\d{10}$/.test(s.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""));
  return true;
}
