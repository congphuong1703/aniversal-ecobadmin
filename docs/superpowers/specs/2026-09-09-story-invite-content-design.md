# Story Invite and Lucky Draw Content Design

## Goal

Refresh the story invitation copy and simplify the public lucky-draw information labels without changing existing images, draw behavior, or navigation.

## Confirmed changes

- Keep `/story/invite-ecotek.jpg` unchanged.
- Replace the invitation title with `Thêm một người bạn, thêm một trận cầu`.
- Replace the invitation body with `Ở EcoBadminton, chúng mình luôn chào đón các thành viên mới.` and a highlighted `Đặc biệt:` paragraph describing the EcoRun trial through 30/9.
- Remove the three old fee list items and the old invitation promise.
- Keep `nhấn vào đây` as plain copy because no destination URL was provided.
- On the public lucky-draw page, remove `Minh bạch từ lượt đầu tiên`, `Năm cơ hội`, `Đối chiếu thật dễ`, and the rule `Chỉ khách đã xác nhận tham dự mới được tham gia quay thưởng.`
- Keep the main section headings, prize cards, draw results, and all existing draw logic unchanged.

## Testing

Add a `Story` component regression test for the new title/body, removed fee text, and preserved invitation image. Extend the public draw test to assert the removed labels and rule are absent. Run focused tests, the full suite, static checks, E2E draw coverage, and the production build before committing.
