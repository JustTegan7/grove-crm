-- One time: workspaces created before message templates existed get the five starter templates.
-- Only workspaces with no templates at all are touched, so nothing an owner edited is overwritten.
INSERT INTO "message_templates" ("id", "workspace_id", "name", "channel", "day", "subject", "body")
SELECT gen_random_uuid(), w."id", t."name", t."channel"::"channel", t."day", t."subject", t."body"
FROM "workspaces" w
CROSS JOIN (VALUES
  ('Day 1 email', 'email', 1, 'Quick hello from {{company}}', E'Hi {{first_name}},\n\nThis is {{owner}} with {{company}}. I came across {{business}} and wanted to introduce myself.\n\nWould you be open to a quick conversation this week?\n\nThanks,\n{{owner}}'),
  ('Day 3 call notes', 'call', 3, NULL, E'Hi {{first_name}}, it''s {{owner}} with {{company}}. I sent a note earlier this week about {{business}}. Do you have a minute?'),
  ('Day 5 text', 'text', 5, NULL, E'Hi {{first_name}}, this is {{owner}} with {{company}}. I reached out about {{business}} and wanted to make sure you saw it. Is now a good time to talk?'),
  ('Day 10 email', 'email', 10, 'Following up on {{business}}', E'Hi {{first_name}},\n\nFollowing up on my earlier note about {{business}}. I would be glad to answer any questions.\n\nThanks,\n{{owner}}'),
  ('Day 14 call notes', 'call', 14, NULL, E'Hi {{first_name}}, it''s {{owner}} with {{company}}. This is my last check-in for now about {{business}}. Is there anything I can help with?')
) AS t("name", "channel", "day", "subject", "body")
WHERE w."deleted_at" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "message_templates" m WHERE m."workspace_id" = w."id");
