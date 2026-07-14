ALTER TABLE "artworks" ADD CONSTRAINT "artworks_title_not_blank" CHECK (length(trim("artworks"."title")) > 0);--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_style_not_blank" CHECK (length(trim("artworks"."style")) > 0);--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_medium_not_blank" CHECK (length(trim("artworks"."medium")) > 0);--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_image_not_blank" CHECK (length(trim("artworks"."image")) > 0);--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_aspect_ratio_positive" CHECK ("artworks"."aspect_ratio" > 0);--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_order_positive" CHECK ("artworks"."order" > 0);--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_year_positive" CHECK ("artworks"."year" is null or "artworks"."year" > 0);--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_price_positive" CHECK ("artworks"."price_inr" is null or "artworks"."price_inr" > 0);--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_status_valid" CHECK ("artworks"."status" in ('archive', 'available', 'sold'));--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_name_not_blank" CHECK (length(trim("categories"."name")) > 0);--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_order_positive" CHECK ("categories"."order" > 0);--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_title_not_blank" CHECK (length(trim("events"."title")) > 0);--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_order_positive" CHECK ("events"."order" > 0);--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_brief_not_blank" CHECK (length(trim("leads"."brief")) > 0);--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_status_valid" CHECK ("leads"."status" in ('new', 'contacted', 'closed'));--> statement-breakpoint
ALTER TABLE "maintainers" ADD CONSTRAINT "maintainers_email_not_blank" CHECK (length(trim("maintainers"."email")) > 0);--> statement-breakpoint
ALTER TABLE "order_presets" ADD CONSTRAINT "order_presets_kind_valid" CHECK ("order_presets"."kind" in ('size', 'budget', 'timeline'));--> statement-breakpoint
ALTER TABLE "order_presets" ADD CONSTRAINT "order_presets_label_not_blank" CHECK (length(trim("order_presets"."label")) > 0);--> statement-breakpoint
ALTER TABLE "order_presets" ADD CONSTRAINT "order_presets_order_positive" CHECK ("order_presets"."order" > 0);--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_quote_not_blank" CHECK (length(trim("testimonials"."quote")) > 0);--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_author_name_not_blank" CHECK (length(trim("testimonials"."author_name")) > 0);--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_order_positive" CHECK ("testimonials"."order" > 0);--> statement-breakpoint
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_title_not_blank" CHECK (length(trim("workshops"."title")) > 0);--> statement-breakpoint
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_blurb_not_blank" CHECK (length(trim("workshops"."blurb")) > 0);--> statement-breakpoint
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_duration_positive" CHECK ("workshops"."duration_hours" is null or "workshops"."duration_hours" > 0);--> statement-breakpoint
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_order_positive" CHECK ("workshops"."order" > 0);