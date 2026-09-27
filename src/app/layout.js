import "./globals.css";

export const metadata = {
  title: "Friends Included Finance",
  description: "Wedding Guests for Hire — Day 4 homework",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
