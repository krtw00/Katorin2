// このファイルは[locale]外のルート（auth/callbackなど）のために必要
// 実際のレイアウトは[locale]/layout.tsxで定義
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
