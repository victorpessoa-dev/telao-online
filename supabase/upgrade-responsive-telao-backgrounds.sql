-- Apply once to preserve the existing telão artwork as the desktop profile
-- and add independent empty profiles for tablet and mobile.
--
-- The data lives in app_settings.value because sponsor settings are
-- church-specific and already versioned through that JSONB document.

begin;

update public.app_settings
set value = jsonb_set(
  value,
  '{designs}',
  coalesce(value->'designs', '{}'::jsonb) || jsonb_build_object(
    'DESKTOP', coalesce(
      value #> '{designs,DESKTOP}',
      value #> '{designs,SHARED}',
      '{}'::jsonb
    ),
    'TABLET', coalesce(
      value #> '{designs,TABLET}',
      (coalesce(value #> '{designs,SHARED}', '{}'::jsonb) - 'backgroundUrl') ||
        jsonb_build_object('backgroundUrl', '')
    ),
    'MOBILE', coalesce(
      value #> '{designs,MOBILE}',
      (coalesce(value #> '{designs,SHARED}', '{}'::jsonb) - 'backgroundUrl') ||
        jsonb_build_object('backgroundUrl', '')
    )
  ),
  true
)
where key = 'sponsor_settings';

comment on column public.app_settings.value is
  'For sponsor_settings, designs.MOBILE, designs.TABLET and designs.DESKTOP each store backgroundUrl, contentWidth, contentHeight, x and y. designs.SHARED is legacy-only.';

commit;
