// English and Slovak UI text. The language comes from the `lang` cookie, else the browser's
// Accept-Language (hooks.server.ts), and reaches components as page.data.lang.
import { page } from '$app/state';
import { invalidateAll } from '$app/navigation';
import { courtKind } from './venues';

export const LANGS = ['en', 'sk'] as const;
export type Lang = (typeof LANGS)[number];
export const isLang = (s: unknown): s is Lang => LANGS.includes(s as Lang);

/** cookie first; otherwise the browser's preferred language, where Czech reads Slovak fine */
export function pickLang(cookie: string | undefined, acceptLanguage: string | null): Lang {
	if (isLang(cookie)) return cookie;
	const wanted = (acceptLanguage ?? '')
		.split(',')
		.map((part) => {
			const [tag, q] = part.trim().split(';q=');
			return { tag: tag.toLowerCase().split('-')[0], q: q === undefined ? 1 : Number(q) };
		})
		.filter((x) => x.tag && x.q > 0)
		.sort((a, b) => b.q - a.q);
	for (const { tag } of wanted) {
		if (tag === 'sk' || tag === 'cs') return 'sk';
		if (tag === 'en') return 'en';
	}
	return 'en';
}

const en_pl = (n: number, one: string, many: string) => (n === 1 ? one : many);
/** Slovak plurals: 1, 2–4, everything else (0 and 5+) */
const sk_pl = (n: number, one: string, few: string, many: string) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);

const en = {
	langName: 'English',
	common: {
		email: 'Email',
		password: 'Password',
		name: 'Name',
		namePlaceholder: 'What friends call you',
		passwordHint: 'At least 8 characters.',
		you: 'You',
		youParen: '(you)',
		today: 'Today',
		tomorrow: 'Tomorrow',
		book: 'Book',
		back: 'Back',
		saving: 'Saving…',
		saved: 'Saved.',
		language: 'Language',
		court: 'Court',
		single: 'Single',
		doubles: 'doubles',
		singles: 'singles',
		each: (price: string) => `${price} each`,
		bookAria: (court: string, time: string) => `Book ${court} at ${time}`,
		premium: (extra: string) => `+${extra} · cheaper courts booked`,
		courtsOpen: (n: number) => `${n} doubles ${en_pl(n, 'court', 'courts')} open`,
		gamesPerWeek: 'Games per week',
		gamesHint: 'E.g. free on four days but want to play twice: pick 2.',
		editAvailability: 'Edit my availability'
	},
	ago: {
		now: 'just now',
		min: (n: number) => `${n} min ago`,
		h: (n: number) => `${n} h ago`,
		d: (n: number) => `${n} d ago`
	},
	nav: {
		home: 'Courtside home',
		main: 'Main',
		matches: 'Matches',
		availability: 'My availability',
		courts: 'Courts',
		admin: 'Admin',
		account: 'Your account',
		signOut: 'Sign out',
		syncSource: "Court data from the clubs' booking pages",
		syncing: 'Syncing courts…',
		synced: (ago: string) => `Courts synced ${ago}`,
		notSynced: 'Courts not synced yet'
	},
	authHero: {
		badge: 'Aurial · Oura · synced every 15 min',
		headline: 'When your crew and a court are free.',
		inviteOnly: 'Invite only'
	},
	login: {
		title: 'Sign in',
		sub: 'Use the email and password you signed up with.',
		submit: 'Sign in',
		busy: 'Signing in…',
		invited: 'Got an invite?',
		createLink: 'Create your account',
		wrong: 'Wrong email or password.'
	},
	signup: {
		title: 'Create your account',
		sub: 'Courtside is invite-only. Use the email you were invited with.',
		submit: 'Create account',
		busy: 'Creating account…',
		haveAccount: 'Already have an account?',
		signInLink: 'Sign in',
		badEmail: 'Enter a valid email address.',
		badName: 'Enter your name (up to 40 characters).',
		shortPassword: 'Use a password of at least 8 characters.',
		taken: 'This email already has an account. Sign in instead.',
		notInvited: "This email hasn't been invited yet. Ask an admin to add it."
	},
	error: {
		label: 'Error',
		notFound: 'Nothing here.',
		broke: 'Something broke.',
		notFoundBody: "This page doesn't exist, or the link is out of date.",
		tryAgain: 'Try again in a moment.',
		home: 'Go to matches'
	},
	matches: {
		title: 'Matches',
		sub: 'Times in the next two weeks when enough of you are free and a court is open at Aurial or Oura.',
		gameLength: 'Game length',
		min: (n: number) => `${n} min`,
		markTitle: 'Mark when you can play',
		markBody: "You haven't added any availability for the next two weeks yet.",
		markCta: 'Start →',
		welcomeTitle: "You're set up.",
		welcomeBody: 'Your usual times are in for the next two weeks. Fine-tune them on My availability.',
		tabsLabel: 'Match type',
		tabs: {
			plan: ['Plan', "within everyone's games per week"],
			doubles: ['Doubles', '4 players · any doubles court'],
			singles: ['Singles', '2 players · Oura single court'],
			oneShort: ['One short', '3 free · find a fourth']
		},
		planEmpty: 'Nothing to plan yet',
		stillSyncing: 'Court data is still syncing',
		planEmptyBody: (marked: number, total: number) =>
			`The plan fills in once enough of you overlap on a free court. ${marked} of ${total} have marked availability.`,
		planIntroA: 'Nobody plays more than their games per week (set yours on ',
		planIntroLink: 'your account',
		planIntroB:
			'). Cheapest per player goes first, and each game goes to whoever has played least that week. Book the courts below; the other tabs list every option.',
		weekOf: (day: string) => `Week of ${day}`,
		moreAt60: (n: number) => `more ${en_pl(n, 'window', 'windows')} if you play 60 min →`,
		emptyDoubles: 'No doubles match yet',
		emptySingles: 'No singles slot yet',
		emptyOneShort: 'Nothing is one player short',
		firstSync: 'The first sync takes about a minute. Refresh in a moment.',
		emptyBody: (marked: number, total: number, need: number, len: number) =>
			`${marked} of ${total} ${en_pl(total, 'person has', 'people have')} marked availability. Matches appear as soon as ${['', '', 'two', 'three', 'four'][need]} of you overlap for ${len} minutes on a free court.`
	},
	card: {
		canStart: (a: string, b: string) => `can start ${a}–${b}`,
		game: (len: number) => `${len} min game`,
		free: (n: number) => `${n} free`,
		pick: (n: number) => `pick ${n}`,
		withoutYou: 'without you',
		more: (n: number) => `+${n} more`,
		premiumTitle: (floor: string) => `Cheaper courts are booked at this time. The cheapest court costs ${floor}.`,
		showDetails: 'Show details',
		hideDetails: 'Hide details',
		startTime: 'Start time',
		startAt: 'Start at',
		players: (n: number) => `${n}p`,
		onlyPricier: 'Only pricier courts are free at this start',
		courtsFree: (n: number, a: string, b: string) => `${n} ${en_pl(n, 'court', 'courts')} free ${a}–${b}, cheapest first`,
		bookingHint: (time: string) => `Booking opens the club's page for that day; pick ${time} on the court above.`,
		startsFrom: (name: string, time: string) => `${name} can start from ${time}`,
		onlyUntil: (name: string, time: string) => `${name} only until a ${time} start`
	},
	avail: {
		title: 'My availability',
		hintDesktop: 'Click or drag to mark when you can play; drag over marked cells to erase.',
		hintMobile: 'Tap a cell to mark it. Hold, then drag, to mark a range.',
		prevWeek: 'Previous week',
		nextWeek: 'Next week',
		thisWeekJump: 'Jump to this week',
		evenings: 'Weekday evenings',
		copyLast: 'Copy last week',
		copyTitle: "Add last week's times to this week",
		nothingLast: 'Nothing marked last week',
		clear: 'Clear week',
		over: 'This week is over.',
		didRemoveEvenings: 'Removed weekday evenings',
		didAddEvenings: 'Added weekday evenings',
		didCopy: 'Copied last week',
		didClear: 'Cleared the week',
		nobody: 'Nobody free yet',
		inspectHint: "Point at, tap or focus a cell to see who's free then.",
		gridLabel: 'Weekly availability. Arrow keys move, Space toggles.',
		cellYou: ', you are free',
		cellOthers: (n: number) => `, ${n} others free`,
		cellNoCourt: ', no court open',
		legend: 'Legend',
		legendYou: "You're free",
		legendFriends: 'Friends free too (also shown on your cells)',
		legendNoCourt: 'No doubles court open',
		thisWeek: 'This week',
		filledIn: (a: number, b: number) => `${a} of ${b} filled in`,
		notYet: 'not yet',
		saveError: "Couldn't save. Check your connection.",
		savedShort: 'Saved',
		hours: (h: number) => `${h} h this week`,
		undo: 'Undo'
	},
	courts: {
		title: 'Courts',
		sub: 'Live availability at Aurial Padel Bratislava and Oura Padel for the next two weeks.',
		overview: 'Two-week overview',
		freeDoubles: 'Free doubles courts',
		pickDay: 'pick a day for details',
		none: 'none',
		many: 'many',
		notSyncedCell: 'not synced',
		swipe: 'Swipe sideways for other hours.',
		detailHint: "Free slots link to the club's booking page for that day.",
		syncFailed: (err: string) => `Last sync failed: ${err}`,
		showingFrom: (ago: string) => `showing data from ${ago}`,
		syncedAgo: (ago: string) => `synced ${ago}`,
		notSyncedYet: 'not synced yet',
		bookingPage: 'Booking page',
		twoPlayers: '2p',
		freeHours: 'Free hours left',
		slotFree: (court: string, a: string, b: string) => `${court} ${a}–${b} free`,
		slotFreeAria: (court: string, a: string) => `${court} ${a} free, open booking page`,
		past: 'past',
		booked: 'booked',
		noData: 'no data',
		legendFree: 'Free',
		legendBooked: 'Booked',
		firstSync: 'Court data is syncing for the first time. Refresh in a minute.',
		refreshed: 'refreshed every 15 minutes'
	},
	account: {
		title: 'Account',
		profile: 'Profile',
		profileHint: 'Your name is what friends see. The weekly plan never gives you more games than this.',
		saveProfile: 'Save profile',
		password: 'Password',
		passwordHint: 'Changing it signs you out on your other devices. Forgot it? Ask an admin to reset it.',
		current: 'Current password',
		new: 'New password',
		changed: 'Password changed.',
		change: 'Change password',
		setup: 'Guided setup',
		setupHint: 'Set your games per week and usual play times in a few steps.',
		setupRun: 'Run setup again',
		gamesRange: (max: number) => `Pick between 1 and ${max} games a week.`,
		newShort: (min: number) => `Use a new password of at least ${min} characters.`,
		wrongCurrent: 'Your current password is wrong.'
	},
	admin: {
		title: 'Admin',
		sub: 'Invite friends, manage members and check the court sync.',
		invite: 'Invite someone',
		inviteHint: 'No email is sent. Tell them to sign up with this address, or copy their signup link below.',
		inviteEmail: 'Email to invite',
		role: 'Role',
		member: 'Member',
		adminRole: 'Admin',
		inviteBtn: 'Invite',
		invited: (email: string) => `Invited ${email}. They can sign up now.`,
		pending: (ago: string) => `pending · ${ago}`,
		adminChip: 'admin',
		copied: 'Copied',
		signupLink: 'Signup link',
		revoke: 'Revoke',
		signupLinkFor: (email: string) => `Signup link for ${email}`,
		members: 'Members',
		roleFor: (name: string) => `Role for ${name}`,
		confirmAdmin: (name: string) => `Make ${name} an admin? Admins can invite and remove people.`,
		confirmMember: (name: string) => `Remove admin rights from ${name}?`,
		confirmReset: (name: string) =>
			`Reset ${name}'s password? They're signed out and need the new password you'll see here.`,
		reset: (name: string) => `Reset ${name}'s password`,
		resetSelf: 'Change yours on your account page',
		confirmRemove: (name: string) => `Remove ${name}? Their availability is deleted too.`,
		remove: (name: string) => `Remove ${name}`,
		removeSelf: "You can't remove yourself",
		newPassword: (name: string) => `New password for ${name}:`,
		shownOnce: '· shown once. Send it to them; they can change it on their account page.',
		sync: 'Court sync',
		syncing: 'Syncing…',
		syncNow: 'Sync now',
		daysSynced: (ok: number, total: number) => `${ok}/${total} days synced`,
		syncFooter: 'Synced automatically every 15 minutes. Aurial Rača is not included.',
		hasAccount: (email: string) => `${email} already has an account.`,
		ownRole: "You can't change your own role.",
		removeYourself: "You can't remove yourself.",
		ownPassword: 'Change your own password on your account page.'
	},
	welcome: {
		title: 'Welcome to Courtside',
		steps: ['You', 'Games', 'Times', 'Done'],
		stepOf: (i: number, n: number) => `Step ${i} of ${n}`,
		basicsTitle: 'First, the basics',
		basicsBody: 'Pick a language and check your name. Friends see it on every match.',
		gamesTitle: 'How often do you want to play?',
		gamesBody: 'The weekly plan never gives you more games than this, even when you mark more free time.',
		perWeek: (n: number) => `${n}× a week`,
		gamesFor: (n: number) =>
			n === 1 ? 'One game a week.' : n >= 5 ? `${n} games: most days of the week.` : `${n} games a week.`,
		timesTitle: 'When can you usually play?',
		timesBody: 'Tap the blocks that usually work. Numbers show how many friends are often free then.',
		parts: { morning: 'Morning', midday: 'Midday', afternoon: 'Afternoon', evening: 'Evening' },
		presetEvenings: 'Weekday evenings',
		presetWeekends: 'Weekends',
		presetClear: 'Clear',
		friendsOften: (n: number) => `${n} ${en_pl(n, 'friend is', 'friends are')} often free`,
		live: 'Next two weeks',
		doublesNoun: (n: number) => `doubles ${en_pl(n, 'window', 'windows')} with you`,
		singlesNoun: (n: number) => `singles ${en_pl(n, 'window', 'windows')} with you`,
		liveDoubles: (n: number) => `${n} doubles ${en_pl(n, 'window', 'windows')}`,
		liveSingles: (n: number) => `${n} singles ${en_pl(n, 'window', 'windows')}`,
		liveNone: 'Pick some times to see the games you could join.',
		reviewTitle: 'Looks good?',
		reviewBody: "We'll add these times to the next two weeks. You can change any of it later.",
		usualTimes: 'Usual times',
		hoursTwoWeeks: (h: number) => `${h} h over the next two weeks`,
		noTimes: 'No times picked. You can mark them later.',
		next: 'Continue',
		skip: 'Skip for now',
		finish: 'Save and see matches'
	}
};

export type Dict = typeof en;

const sk: Dict = {
	langName: 'Slovenčina',
	common: {
		email: 'E-mail',
		password: 'Heslo',
		name: 'Meno',
		namePlaceholder: 'Ako ťa volajú kamaráti',
		passwordHint: 'Aspoň 8 znakov.',
		you: 'Ty',
		youParen: '(ty)',
		today: 'Dnes',
		tomorrow: 'Zajtra',
		book: 'Rezervovať',
		back: 'Späť',
		saving: 'Ukladám…',
		saved: 'Uložené.',
		language: 'Jazyk',
		court: 'Kurt',
		single: 'Single',
		doubles: 'štvorhra',
		singles: 'dvojhra',
		each: (price: string) => `${price} na osobu`,
		bookAria: (court: string, time: string) => `Rezervovať ${court} o ${time}`,
		premium: (extra: string) => `+${extra} · lacnejšie kurty obsadené`,
		courtsOpen: (n: number) => `${n} ${sk_pl(n, 'voľný kurt', 'voľné kurty', 'voľných kurtov')} na štvorhru`,
		gamesPerWeek: 'Hier za týždeň',
		gamesHint: 'Napr. máš voľno štyri dni, ale chceš hrať dvakrát: vyber 2.',
		editAvailability: 'Upraviť moju dostupnosť'
	},
	ago: {
		now: 'práve teraz',
		min: (n: number) => `pred ${n} min`,
		h: (n: number) => `pred ${n} h`,
		d: (n: number) => `pred ${n} d`
	},
	nav: {
		home: 'Courtside, domov',
		main: 'Hlavné menu',
		matches: 'Zápasy',
		availability: 'Moja dostupnosť',
		courts: 'Kurty',
		admin: 'Admin',
		account: 'Tvoj účet',
		signOut: 'Odhlásiť',
		syncSource: 'Dáta o kurtoch z rezervačných stránok klubov',
		syncing: 'Načítavam kurty…',
		synced: (ago: string) => `Kurty načítané ${ago}`,
		notSynced: 'Kurty ešte nie sú načítané'
	},
	authHero: {
		badge: 'Aurial · Oura · aktualizované každých 15 min',
		headline: 'Keď má partia aj kurt voľno.',
		inviteOnly: 'Len na pozvánku'
	},
	login: {
		title: 'Prihlásenie',
		sub: 'Zadaj e-mail a heslo k svojmu účtu.',
		submit: 'Prihlásiť sa',
		busy: 'Prihlasujem…',
		invited: 'Máš pozvánku?',
		createLink: 'Vytvor si účet',
		wrong: 'Nesprávny e-mail alebo heslo.'
	},
	signup: {
		title: 'Vytvor si účet',
		sub: 'Courtside je len na pozvánku. Použi e-mail, na ktorý ťa pozvali.',
		submit: 'Vytvoriť účet',
		busy: 'Vytváram účet…',
		haveAccount: 'Už máš účet?',
		signInLink: 'Prihlás sa',
		badEmail: 'Zadaj platnú e-mailovú adresu.',
		badName: 'Zadaj meno (najviac 40 znakov).',
		shortPassword: 'Heslo musí mať aspoň 8 znakov.',
		taken: 'Tento e-mail už má účet. Prihlás sa.',
		notInvited: 'Tento e-mail zatiaľ nemá pozvánku. Popros admina, nech ho pridá.'
	},
	error: {
		label: 'Chyba',
		notFound: 'Nič tu nie je.',
		broke: 'Niečo sa pokazilo.',
		notFoundBody: 'Táto stránka neexistuje alebo je odkaz neaktuálny.',
		tryAgain: 'Skús to o chvíľu znova.',
		home: 'Na zápasy'
	},
	matches: {
		title: 'Zápasy',
		sub: 'Termíny v najbližších dvoch týždňoch, keď má dosť z vás voľno a v Auriali alebo Oure je voľný kurt.',
		gameLength: 'Dĺžka hry',
		min: (n: number) => `${n} min`,
		markTitle: 'Označ, kedy môžeš hrať',
		markBody: 'Na najbližšie dva týždne ešte nemáš označený žiadny čas.',
		markCta: 'Začať →',
		welcomeTitle: 'Hotovo, máš nastavené.',
		welcomeBody: 'Tvoje zvyčajné časy sú zapísané na najbližšie dva týždne. Dolaď ich v Mojej dostupnosti.',
		tabsLabel: 'Typ zápasu',
		tabs: {
			plan: ['Plán', 'v rámci hier za týždeň každého'],
			doubles: ['Štvorhra', '4 hráči · hocijaký kurt na štvorhru'],
			singles: ['Dvojhra', '2 hráči · single kurt v Oure'],
			oneShort: ['Chýba jeden', '3 majú voľno · nájdi štvrtého']
		},
		planEmpty: 'Zatiaľ nie je čo plánovať',
		stillSyncing: 'Dáta o kurtoch sa ešte načítavajú',
		planEmptyBody: (marked: number, total: number) =>
			`Plán sa naplní, keď sa dosť z vás prekryje na voľnom kurte. Dostupnosť má označenú ${marked} z ${total}.`,
		planIntroA: 'Nikto nehrá viac, než koľko hier za týždeň chce (svoje si nastav v ',
		planIntroLink: 'účte',
		planIntroB:
			'). Najprv ide najlacnejšie na osobu a každá hra pripadne tomu, kto v tom týždni hral najmenej. Kurty rezervuj nižšie, ostatné karty ukazujú všetky možnosti.',
		weekOf: (day: string) => `Týždeň od ${day}`,
		moreAt60: (n: number) => `${sk_pl(n, 'ďalšie okno', 'ďalšie okná', 'ďalších okien')} pri hre na 60 min →`,
		emptyDoubles: 'Zatiaľ žiadny zápas štvorhry',
		emptySingles: 'Zatiaľ žiadny termín na dvojhru',
		emptyOneShort: 'Nikde nechýba len jeden hráč',
		firstSync: 'Prvé načítanie trvá asi minútu. Obnov stránku o chvíľu.',
		emptyBody: (marked: number, total: number, need: number, len: number) =>
			`Dostupnosť má označenú ${marked} z ${total}. Zápasy sa ukážu, keď sa ${['', '', 'dvaja', 'traja', 'štyria'][need]} z vás prekryjú na ${len} minút na voľnom kurte.`
	},
	card: {
		canStart: (a: string, b: string) => `začiatok ${a}–${b}`,
		game: (len: number) => `hra na ${len} min`,
		free: (n: number) => `${n} ${sk_pl(n, 'voľný', 'voľní', 'voľných')}`,
		pick: (n: number) => `vyber ${n}`,
		withoutYou: 'bez teba',
		more: (n: number) => `+${n} ${sk_pl(n, 'ďalší', 'ďalšie', 'ďalších')}`,
		premiumTitle: (floor: string) => `V tomto čase sú lacnejšie kurty obsadené. Najlacnejší kurt stojí ${floor}.`,
		showDetails: 'Zobraziť detaily',
		hideDetails: 'Skryť detaily',
		startTime: 'Čas začiatku',
		startAt: 'Začiatok o',
		players: (n: number) => `${n} os.`,
		onlyPricier: 'Pri tomto začiatku sú voľné len drahšie kurty',
		courtsFree: (n: number, a: string, b: string) =>
			`${n} ${sk_pl(n, 'voľný kurt', 'voľné kurty', 'voľných kurtov')} ${a}–${b}, od najlacnejšieho`,
		bookingHint: (time: string) => `Rezervácia otvorí stránku klubu na ten deň; vyber si tam ${time} na kurte vyššie.`,
		startsFrom: (name: string, time: string) => `${name} môže začať od ${time}`,
		onlyUntil: (name: string, time: string) => `${name} len so začiatkom najneskôr ${time}`
	},
	avail: {
		title: 'Moja dostupnosť',
		hintDesktop: 'Klikni alebo potiahni a označ, kedy môžeš hrať; ťahaním cez označené políčka ich zmažeš.',
		hintMobile: 'Ťukni na políčko a označíš ho. Podrž a potiahni a označíš rozsah.',
		prevWeek: 'Predchádzajúci týždeň',
		nextWeek: 'Nasledujúci týždeň',
		thisWeekJump: 'Prejsť na tento týždeň',
		evenings: 'Večery cez týždeň',
		copyLast: 'Skopírovať minulý týždeň',
		copyTitle: 'Pridať časy z minulého týždňa',
		nothingLast: 'Minulý týždeň nie je nič označené',
		clear: 'Vymazať týždeň',
		over: 'Tento týždeň už skončil.',
		didRemoveEvenings: 'Večery cez týždeň odstránené',
		didAddEvenings: 'Večery cez týždeň pridané',
		didCopy: 'Minulý týždeň skopírovaný',
		didClear: 'Týždeň vymazaný',
		nobody: 'Zatiaľ nikto nemá voľno',
		inspectHint: 'Ukáž, ťukni alebo prejdi na políčko a uvidíš, kto má vtedy voľno.',
		gridLabel: 'Týždenná dostupnosť. Šípky posúvajú, medzerník prepína.',
		cellYou: ', máš voľno',
		cellOthers: (n: number) => `, voľno majú ďalší: ${n}`,
		cellNoCourt: ', žiadny voľný kurt',
		legend: 'Legenda',
		legendYou: 'Máš voľno',
		legendFriends: 'Voľno majú aj kamaráti (aj na tvojich políčkach)',
		legendNoCourt: 'Žiadny voľný kurt na štvorhru',
		thisWeek: 'Tento týždeň',
		filledIn: (a: number, b: number) => `Vyplnené: ${a} z ${b}`,
		notYet: 'ešte nie',
		saveError: 'Nepodarilo sa uložiť. Skontroluj pripojenie.',
		savedShort: 'Uložené',
		hours: (h: number) => `${h} h tento týždeň`,
		undo: 'Späť'
	},
	courts: {
		title: 'Kurty',
		sub: 'Aktuálna obsadenosť v Aurial Padel Bratislava a Oura Padel na najbližšie dva týždne.',
		overview: 'Prehľad na dva týždne',
		freeDoubles: 'Voľné kurty na štvorhru',
		pickDay: 'vyber deň a uvidíš detaily',
		none: 'žiadne',
		many: 'veľa',
		notSyncedCell: 'nenačítané',
		swipe: 'Potiahni do strany pre ďalšie hodiny.',
		detailHint: 'Voľné časy vedú na rezervačnú stránku klubu na ten deň.',
		syncFailed: (err: string) => `Posledné načítanie zlyhalo: ${err}`,
		showingFrom: (ago: string) => `dáta ${ago}`,
		syncedAgo: (ago: string) => `načítané ${ago}`,
		notSyncedYet: 'zatiaľ nenačítané',
		bookingPage: 'Rezervácie',
		twoPlayers: '2 os.',
		freeHours: 'Zostávajúce voľné hodiny',
		slotFree: (court: string, a: string, b: string) => `${court} ${a}–${b} voľný`,
		slotFreeAria: (court: string, a: string) => `${court} ${a} voľný, otvoriť rezervácie`,
		past: 'už prebehlo',
		booked: 'obsadené',
		noData: 'bez dát',
		legendFree: 'Voľné',
		legendBooked: 'Obsadené',
		firstSync: 'Dáta o kurtoch sa načítavajú prvýkrát. Obnov stránku o minútu.',
		refreshed: 'obnovuje sa každých 15 minút'
	},
	account: {
		title: 'Účet',
		profile: 'Profil',
		profileHint: 'Meno vidia kamaráti. Týždenný plán ti nikdy nedá viac hier, než tu nastavíš.',
		saveProfile: 'Uložiť profil',
		password: 'Heslo',
		passwordHint: 'Zmena ťa odhlási na ostatných zariadeniach. Zabudnuté heslo? Popros admina, nech ho resetuje.',
		current: 'Súčasné heslo',
		new: 'Nové heslo',
		changed: 'Heslo zmenené.',
		change: 'Zmeniť heslo',
		setup: 'Sprievodca nastavením',
		setupHint: 'Nastav si počet hier a zvyčajné časy v pár krokoch.',
		setupRun: 'Spustiť sprievodcu',
		gamesRange: (max: number) => `Vyber 1 až ${max} hier za týždeň.`,
		newShort: (min: number) => `Nové heslo musí mať aspoň ${min} znakov.`,
		wrongCurrent: 'Súčasné heslo nie je správne.'
	},
	admin: {
		title: 'Admin',
		sub: 'Pozývaj kamarátov, spravuj členov a sleduj načítavanie kurtov.',
		invite: 'Pozvať niekoho',
		inviteHint: 'Žiadny e-mail sa neodošle. Povedz im, nech sa zaregistrujú s touto adresou, alebo im pošli odkaz nižšie.',
		inviteEmail: 'E-mail na pozvanie',
		role: 'Rola',
		member: 'Člen',
		adminRole: 'Admin',
		inviteBtn: 'Pozvať',
		invited: (email: string) => `Pozvánka pre ${email} je hotová. Môže sa zaregistrovať.`,
		pending: (ago: string) => `čaká · ${ago}`,
		adminChip: 'admin',
		copied: 'Skopírované',
		signupLink: 'Odkaz na registráciu',
		revoke: 'Zrušiť',
		signupLinkFor: (email: string) => `Odkaz na registráciu pre ${email}`,
		members: 'Členovia',
		roleFor: (name: string) => `Rola: ${name}`,
		confirmAdmin: (name: string) => `${name}: dať práva admina? Admini môžu pozývať a odstraňovať ľudí.`,
		confirmMember: (name: string) => `${name}: odobrať práva admina?`,
		confirmReset: (name: string) =>
			`${name}: resetovať heslo? Odhlási sa a bude potrebovať nové heslo, ktoré tu uvidíš.`,
		reset: (name: string) => `Resetovať heslo: ${name}`,
		resetSelf: 'Svoje heslo si zmeň v účte',
		confirmRemove: (name: string) => `${name}: odstrániť? Zmaže sa aj jeho dostupnosť.`,
		remove: (name: string) => `Odstrániť: ${name}`,
		removeSelf: 'Seba odstrániť nemôžeš',
		newPassword: (name: string) => `Nové heslo (${name}):`,
		shownOnce: '· zobrazí sa len raz. Pošli ho ďalej; zmeniť si ho dá v účte.',
		sync: 'Načítavanie kurtov',
		syncing: 'Načítavam…',
		syncNow: 'Načítať teraz',
		daysSynced: (ok: number, total: number) => `${ok}/${total} dní načítaných`,
		syncFooter: 'Načítava sa automaticky každých 15 minút. Aurial Rača nie je zahrnutá.',
		hasAccount: (email: string) => `${email} už má účet.`,
		ownRole: 'Vlastnú rolu zmeniť nemôžeš.',
		removeYourself: 'Seba odstrániť nemôžeš.',
		ownPassword: 'Svoje heslo si zmeň v účte.'
	},
	welcome: {
		title: 'Vitaj v Courtside',
		steps: ['Ty', 'Hry', 'Časy', 'Hotovo'],
		stepOf: (i: number, n: number) => `Krok ${i} z ${n}`,
		basicsTitle: 'Najprv základy',
		basicsBody: 'Vyber si jazyk a skontroluj meno. Kamaráti ho uvidia pri každom zápase.',
		gamesTitle: 'Ako často chceš hrať?',
		gamesBody: 'Týždenný plán ti nikdy nedá viac hier, ani keď označíš viac voľného času.',
		perWeek: (n: number) => `${n}× týždenne`,
		gamesFor: (n: number) =>
			n === 1 ? 'Jedna hra za týždeň.' : n >= 5 ? `${n} hier: väčšinu dní v týždni.` : `${n} hry za týždeň.`,
		timesTitle: 'Kedy zvyčajne môžeš hrať?',
		timesBody: 'Ťukni na bloky, ktoré ti zvyčajne vyhovujú. Čísla ukazujú, koľko kamarátov má vtedy často voľno.',
		parts: { morning: 'Ráno', midday: 'Obed', afternoon: 'Popoludnie', evening: 'Večer' },
		presetEvenings: 'Večery cez týždeň',
		presetWeekends: 'Víkendy',
		presetClear: 'Vymazať',
		friendsOften: (n: number) =>
			`${n} ${sk_pl(n, 'kamarát má', 'kamaráti majú', 'kamarátov má')} vtedy často voľno`,
		live: 'Najbližšie dva týždne',
		doublesNoun: (n: number) => `${sk_pl(n, 'termín', 'termíny', 'termínov')} na štvorhru s tebou`,
		singlesNoun: (n: number) => `${sk_pl(n, 'termín', 'termíny', 'termínov')} na dvojhru s tebou`,
		liveDoubles: (n: number) => `${n} ${sk_pl(n, 'termín', 'termíny', 'termínov')} na štvorhru`,
		liveSingles: (n: number) => `${n} ${sk_pl(n, 'termín', 'termíny', 'termínov')} na dvojhru`,
		liveNone: 'Vyber nejaké časy a uvidíš, do ktorých hier by si sa dostal.',
		reviewTitle: 'Sedí to?',
		reviewBody: 'Tieto časy pridáme do najbližších dvoch týždňov. Kedykoľvek ich môžeš zmeniť.',
		usualTimes: 'Zvyčajné časy',
		hoursTwoWeeks: (h: number) => `${h} h za najbližšie dva týždne`,
		noTimes: 'Žiadne časy. Označiť ich môžeš neskôr.',
		next: 'Pokračovať',
		skip: 'Teraz preskočiť',
		finish: 'Uložiť a ukázať zápasy'
	}
};

const DICTS: Record<Lang, Dict> = { en, sk };

/** the dictionary for a known language; on the server, pass locals.lang */
export const dict = (lang: Lang) => DICTS[lang];

/** the current page's language; components read it during render, so it stays reactive */
export const lang = (): Lang => (isLang(page.data?.lang) ? page.data.lang : 'en');
export const t = () => DICTS[lang()];

/** switches language for this browser and reloads data without leaving the page */
export async function setLang(next: Lang) {
	document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
	document.documentElement.lang = next;
	await invalidateAll();
}

// ---- dates and times in the current language ----

const SK_MONTHS = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec'];
const enWeekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' });
const skWeekday = new Intl.DateTimeFormat('sk', { weekday: 'short', timeZone: 'UTC' });
const enDayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const utc = (date: string) => new Date(date + 'T12:00:00Z');

/** "Mon" / "Po" */
export function fmtWeekday(date: string): string {
	if (lang() === 'en') return enWeekday.format(utc(date));
	const w = skWeekday.format(utc(date));
	return w[0].toUpperCase() + w.slice(1);
}
/** "16 Nov" / "16. nov" */
export function fmtDayMonth(date: string): string {
	if (lang() === 'en') return enDayMonth.format(utc(date));
	return `${Number(date.slice(8))}. ${SK_MONTHS[Number(date.slice(5, 7)) - 1]}`;
}
export const fmtDay = (date: string) => `${fmtWeekday(date)} ${fmtDayMonth(date)}`;

/** "12 €", "12.50 €" / "12,50 €" */
export function euro(n: number): string {
	const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
	return `${lang() === 'sk' ? s.replace('.', ',') : s} €`;
}

export function timeAgo(iso: string, now = Date.now()): string {
	const a = t().ago;
	const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
	if (s < 60) return a.now;
	const m = Math.round(s / 60);
	if (m < 60) return a.min(m);
	const h = Math.round(m / 60);
	if (h < 24) return a.h(h);
	return a.d(Math.round(h / 24));
}

/** "7 - kurt Think Big Collective" -> "Court 7" / "Kurt 7"; Oura's "Single" stays "Single" */
export function courtLabel(name: string): string {
	const n = name.match(/(\d+)/);
	return courtKind(name) === 'singles' ? t().common.single : n ? `${t().common.court} ${n[1]}` : name;
}
