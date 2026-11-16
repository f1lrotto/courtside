import type { User } from '#lib/server/auth.js';
import type { Lang } from '#lib/i18n.js';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			lang: Lang;
		}
	}
}

export {};
