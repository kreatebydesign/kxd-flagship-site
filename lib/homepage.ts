import { CLIENT_LOGOS } from "./content/logos";
import { HOMEPAGE_SERVICES } from "./content/services";
import { PRIMARY_PROJECTS } from "./projects";
import { getPublicReviews } from "./reviews";

export { HOMEPAGE_SERVICES, CLIENT_LOGOS };

export const HOMEPAGE_PROJECTS = PRIMARY_PROJECTS;
export const HOMEPAGE_REVIEWS = getPublicReviews();
