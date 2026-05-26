import { Bucket } from "@/lib/generated/prisma/client";

const RULES: { bucket: Bucket; keywords: string[] }[] = [
  {
    bucket: Bucket.DATABASE,
    keywords: ["dynamo", "rds", "postgres", "mysql", "mongo", "redis", "sql", "db", "database", "aurora"],
  },
  {
    bucket: Bucket.INFRASTRUCTURE,
    keywords: ["lambda", "ec2", "vpc", "subnet", "ecs", "eks", "fargate", "iam", "s3", "cloudfront", "alb", "elb", "infra", "network", "security-group"],
  },
  {
    bucket: Bucket.FRONTEND,
    keywords: ["react", "next", "vue", "angular", "svelte", "ui", "frontend", "css", "html", "component", "page", "layout", "tailwind"],
  },
  {
    bucket: Bucket.BACKEND_API,
    keywords: ["api", "rest", "graphql", "express", "fastapi", "django", "flask", "endpoint", "route", "handler", "backend", "server"],
  },
  {
    bucket: Bucket.DEPLOYMENT,
    keywords: ["docker", "kubernetes", "k8s", "helm", "deploy", "vercel", "heroku", "cicd", "pipeline", "github-action", "workflow", "release"],
  },
  {
    bucket: Bucket.MONITORING,
    keywords: ["grafana", "cloudwatch", "datadog", "prometheus", "metric", "alert", "dashboard", "log", "trace", "monitor"],
  },
  {
    bucket: Bucket.TESTING,
    keywords: ["test", "jest", "pytest", "cypress", "spec", "unit", "integration", "e2e", "coverage"],
  },
  {
    bucket: Bucket.DESIGN,
    keywords: ["figma", "design", "mockup", "wireframe", "prototype", "sketch", "ux", "ui-design"],
  },
];

export function inferBucket(filename: string): Bucket {
  const lower = filename.toLowerCase().replace(/[_\-.\s]/g, "-");
  for (const { bucket, keywords } of RULES) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return bucket;
    }
  }
  return Bucket.OTHER;
}
