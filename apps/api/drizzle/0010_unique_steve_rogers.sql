DROP INDEX "ix_comm_events_scheduled_status";--> statement-breakpoint
DROP INDEX "ix_comm_publications_updated";--> statement-breakpoint
DROP INDEX "ix_comm_status_history_event_time";--> statement-breakpoint
CREATE INDEX "ix_comm_events_scheduled_status" ON "comm_events" USING btree ("scheduled_at","status");--> statement-breakpoint
CREATE INDEX "ix_comm_publications_updated" ON "comm_publications" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "ix_comm_status_history_event_time" ON "comm_status_history" USING btree ("event_id","changed_at");