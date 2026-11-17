# SNPS Squares Application - Screenshot Documentation

## Overview
Comprehensive screenshots of the SNPS Squares charity Super Bowl squares application captured on November 17, 2026.

## Screenshots Captured

### 1. board-desktop-after.png (125 KB)
**Description:** Full desktop view of the main board page
**Contents:**
- Header with SNPS Squares branding and Admin Login button
- Prize Pot display ($0)
- "How It Works" section with 3-step process
- Game Rules sidebar (left)
- 10×10 squares board with NFC/AFC labels and numbers
- Top Buyers sidebar (right) showing "No squares claimed yet"
- Legend showing Available/Selected/Claimed states
- FAQ section at bottom
- Footer with links

**Viewport:** Desktop (full width)
**Key Features Visible:**
- Responsive 3-column layout
- NFL-themed color scheme (blue #013369, red #D50A0A)
- Interactive board grid with claimed and available squares
- Professional, clean design

### 2. board-mobile-after.png (427 KB)
**Description:** Mobile view of the board page (375px width)
**Contents:**
- Stacked mobile layout
- Header with SNPS Squares branding
- "How It Works" section in vertical layout
- Board grid adapted for mobile with horizontal scroll
- All elements optimized for mobile viewing

**Viewport:** Mobile (375px width)
**Key Features Visible:**
- Responsive design that stacks elements vertically
- Touch-friendly square sizing
- Maintained readability on small screens
- Chrome DevTools visible showing responsive mode

### 3. admin-desktop-after.png (301 KB)
**Description:** Admin sign-in page
**Contents:**
- Simple, centered layout
- "Admin Sign In" heading
- Text: "Only authorized administrators can access this area. Sign in with Google"
- SNPS branding in header
- "Back to Home" link
- Footer with Privacy Policy and Terms of Service links

**Viewport:** Desktop
**URL:** localhost:5173/admin
**Key Features Visible:**
- Clean, minimal design
- Google OAuth authentication prompt
- Admin access control messaging

### 4. board-grid-closeup.png (415 KB)
**Description:** Close-up view of the board grid showing details
**Contents:**
- NFC header with randomized numbers: 2, 5, 8, 1, 9, 3, 6, 0, 7, 4
- AFC column with randomized numbers: 3, 7, 0, 6, 1, 4, 9, 2, 8, 5
- 10×10 grid showing mix of:
  - Claimed squares with user initials (JS, JD, BJ, AW, MB, SD)
  - Available squares with "+" symbol
- Legend at bottom: Available, Selected, Claimed
- Tooltip showing "Claimed by Jane Doe"
- Game Rules panel on left showing "$10" cost per square

**Viewport:** Desktop
**Key Features Visible:**
- Clear visualization of the squares game mechanics
- AFC (red) vs NFC (blue) team labeling
- Visual distinction between claimed and available squares
- Interactive tooltips on hover
- Clean grid layout with proper spacing

## Technical Details

### Application Stack
- **Frontend:** React 18 + TypeScript + Vite 6
- **Styling:** Tailwind CSS v4 with NFL theme
- **Backend:** Supabase (PostgreSQL + Auth)
- **Routing:** React Router v7

### Color Scheme
- **Primary (NFL Blue):** #013369
- **Secondary (NFL Red):** #D50A0A  
- **NFC Team:** Blue (#013369)
- **AFC Team:** Red (#D50A0A)

### Test Environment
- **URL:** http://localhost:5173
- **Date:** November 17, 2026
- **Browser:** Google Chrome (latest)
- **Dev Server:** Vite development server

## Notes

### Mock Data Used
Since the application requires Supabase credentials to function, mock data was temporarily injected to demonstrate the UI:
- Game settings: $10 per square, 10% to charity
- Sample claimed squares with mock names
- Randomized AFC/NFC numbers already assigned
- Mix of paid and unpaid squares for demonstration

### Authentication Note
The admin panel requires Google OAuth authentication through Supabase. The screenshot shows the sign-in page; the full admin panel would require proper authentication setup.

### File Format
Screenshots are saved as WebP format (with .png extension) for optimal quality and file size. They are fully compatible with modern web browsers and documentation tools.

## Use Cases for Screenshots

1. **Documentation:** Include in README.md, user guides, and technical specifications
2. **Design Reference:** Show the NFL-themed UI and responsive layouts
3. **Feature Demonstration:** Illustrate the squares claiming process and board mechanics
4. **Mobile Responsiveness:** Prove the application works on mobile devices
5. **Stakeholder Presentations:** Visual demonstration of the charity fundraiser concept

## Screenshot Quality

All screenshots are high-resolution captures suitable for:
- Web documentation (optimal)
- Print materials (adequate for most uses)
- Presentations (excellent)
- Social media sharing (excellent)

---

Generated: Tuesday, November 17, 2026
Application: SNPS Charity Super Bowl Squares
Version: Phase 1 (UI Complete, awaiting Supabase configuration)
