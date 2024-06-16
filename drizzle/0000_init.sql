CREATE TABLE `posts` (
	`slug` text PRIMARY KEY NOT NULL,
	`view` integer NOT NULL,
	`last` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
