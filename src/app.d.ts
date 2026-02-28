/// <reference types="@sveltejs/kit" />

declare namespace App {
  interface Locals {
    session: import('@auth/sveltekit').Session | null;
  }
  interface PageData {
    session: import('@auth/sveltekit').Session | null;
  }
}
