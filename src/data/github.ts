

export interface GithubStats {
  login: string;
  name: string;
  followers: number;
  publicRepos: number;
  totalStars: number;
  createdYear: number;
  topLanguages: { name: string; count: number }[];
  topRepo: { name: string; stars: number; url: string } | null;
  fetchedAt: string;
}

/** Subconjunto de la respuesta de GET /users/{user} que usamos. */
interface GithubUser {
  login: string;
  name: string | null;
  followers: number;
  public_repos: number;
  created_at: string;
}

/** Subconjunto de la respuesta de GET /users/{user}/repos que usamos. */
interface GithubRepo {
  name: string;
  fork: boolean;
  language: string | null;
  stargazers_count: number;
  html_url: string;
}

let _cache: { at: number; data: GithubStats | null } | null = null;
const DEV_TTL = 1000 * 60 * 30; // 30 min

export async function getGithubStats(user = "Juferoga"): Promise<GithubStats | null> {
  if (_cache && Date.now() - _cache.at < DEV_TTL) return _cache.data;
  try {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "juferoga-portfolio-build",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const [uRes, rRes] = await Promise.all([
      fetch(`https://api.github.com/users/${user}`, { headers }),
      fetch(`https://api.github.com/users/${user}/repos?per_page=100&type=owner&sort=pushed`, { headers }),
    ]);
    if (!uRes.ok || !rRes.ok) throw new Error(`GitHub API ${uRes.status}/${rRes.status}`);

    const u = (await uRes.json()) as GithubUser;
    const repos = (await rRes.json()) as GithubRepo[];
    if (!Array.isArray(repos)) throw new Error("GitHub API: respuesta inesperada de /repos");
    const own = repos.filter((r) => !r.fork);

    const totalStars = own.reduce((s, r) => s + (r.stargazers_count || 0), 0);
    const langCount: Record<string, number> = {};
    for (const r of own) if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
    const topLanguages = Object.entries(langCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));
    const top = own.slice().sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))[0];

    const data: GithubStats = {
      login: u.login,
      name: u.name || u.login,
      followers: u.followers || 0,
      publicRepos: u.public_repos || 0,
      totalStars,
      createdYear: new Date(u.created_at).getFullYear(),
      topLanguages,
      topRepo: top ? { name: top.name, stars: top.stargazers_count || 0, url: top.html_url } : null,
      fetchedAt: new Date().toISOString(),
    };
    _cache = { at: Date.now(), data };
    return data;
  } catch (e) {
    console.warn("[github stats] build fetch failed:", (e as Error).message);
    _cache = { at: Date.now(), data: null };
    return null;
  }
}
