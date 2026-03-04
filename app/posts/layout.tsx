import { getAllPosts, buildBacklinkMap } from '@/lib/posts';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { MobileMenuButton } from '@/components/MobileMenuButton';

export default function PostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allPosts = getAllPosts();
  const backlinkMap = buildBacklinkMap();

  return (
    <div className="flex min-h-screen">
      <Sidebar allPosts={allPosts} backlinkMap={backlinkMap} />
      <main className="flex-1 min-w-0">
        <MobileMenuButton />
        {children}
      </main>
    </div>
  );
}
