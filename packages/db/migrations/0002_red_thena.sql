CREATE TABLE "raw_scorecards" (
	"usta_match_id" varchar(32) PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"source_url" text,
	"played_on" timestamp with time zone,
	"parsed" jsonb NOT NULL,
	"home_team_name" text,
	"visitor_team_name" text,
	"league" text,
	"court_count" integer DEFAULT 0 NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "raw_scorecards_year_idx" ON "raw_scorecards" USING btree ("year");