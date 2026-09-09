# Lucky Draw Copy and Header Update Design

## Goal

Make the public lucky-draw page use the approved Vietnamese wording and make its internal header match the story page without changing draw behavior or technical admin routes.

## Confirmed changes

- Replace visible `Admin` references in the public draw page with `Ban tổ chức`.
- Remove `Cùng theo dõi năm lượt quay và tìm con số may mắn của mình.` from the page introduction.
- Change `Trong thẻ xác nhận RSVP thành công...` to `Trong thẻ xác nhận thành công...`.
- Replace every configured public reward description with `Công bố sau`, including the special prize.
- Keep the home-page `Quay trúng thưởng` menu item unchanged.
- Make `/quay-trung-thuong` use the same internal header pattern as the story page: brand on the left and one `← Quay lại` link to the home page.
- Keep the existing admin-only draw authorization, same-number winner mapping, polling, API paths, cookie names, and internal identifiers unchanged.
- Keep draw information headings on one line where the viewport allows, with responsive sizing that prevents horizontal overflow on mobile.

## Approach

Update the shared prize configuration and the public draw route/component copy. Adjust only the draw-page heading typography if needed for one-line section titles; do not redesign the header or introduce a new navigation component because the existing story-page header already provides the intended pattern.

## Testing

Update the public draw component tests to assert the approved copy, absence of the removed wording, all rewards equal `Công bố sau`, and the one-line heading CSS rule. Run the focused component test, then the full test, lint, typecheck, build, and relevant Playwright draw flow before committing.
