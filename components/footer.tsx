import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t py-8">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-sm text-muted-foreground">© 2025 学习搭子. 保留所有权利.</p>
        <div className="flex items-center space-x-4">
          <Link href="#" className="text-sm text-muted-foreground hover:text-primary">
            用户协议
          </Link>
          <Link href="#" className="text-sm text-muted-foreground hover:text-primary">
            隐私政策
          </Link>
          <Link href="#" className="text-sm text-muted-foreground hover:text-primary">
            联系我们
          </Link>
        </div>
      </div>
    </footer>
  )
}
