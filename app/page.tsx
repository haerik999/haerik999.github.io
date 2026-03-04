import { getAllPosts } from '@/lib/posts';
import { HomePostGrid } from '@/components/HomePostGrid';

export default function Home() {
  const posts = getAllPosts();

  return (
    <main className="py-14">
      <section className="mb-10 text-center">
        <h1 className="text-[34px] font-extrabold tracking-tight text-gray-900 mb-3">Haerik</h1>
        <p className="text-lg text-gray-500">Story of a Developer</p>
      </section>

      <HomePostGrid posts={posts} />
    </main>
  );
}
