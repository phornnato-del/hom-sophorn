import { BannerRequest } from "@/feature/api/banner/type/BannerRequest"
import { getErrorMessage } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { fail, ok } from "@/lib/response"
import { paginatedResult, parsePaginationParams } from "@/lib/pagination"
import { withImageUrl } from "@/lib/withImageUrl"

export async function GET(req: Request) {
    try{
        const parsed = parsePaginationParams(req.url)
        if ("error" in parsed) return fail(parsed.error, 400)
        const { page, pageSize, filter, skip } = parsed.params
        const where = filter
            ? { OR: [
                { name: { contains: filter, mode: "insensitive" as const } },
                { tag: { contains: filter, mode: "insensitive" as const } },
                { title: { contains: filter, mode: "insensitive" as const } },
                { slogan: { contains: filter, mode: "insensitive" as const } },
                { desc: { contains: filter, mode: "insensitive" as const } },
                { link: { contains: filter, mode: "insensitive" as const } },
                { image: { contains: filter, mode: "insensitive" as const } },
            ] }
            : {}

        const [banner, total] = await Promise.all([
            prisma.banner.findMany({
                where,
                select: {id: true,name: true, tag: true, title: true, slogan: true, desc: true, link: true, image: true},
                orderBy: { createAt: "desc" },
                skip,
                take: pageSize,
            }),
            prisma.banner.count({ where }),
        ])

        return ok(paginatedResult(banner.map(withImageUrl), total, page, pageSize), "Banner retrieved")

    }catch(error: unknown){
        console.error(error)
        return fail(getErrorMessage(error))
    }
}

export  async function POST(req: Request) {
    try {

        const { tag, title, slogan, desc, link, name, image } = await req.json() as BannerRequest;

        if (!title || !slogan || !desc || !link || !name || !image) {
            return fail("All fields are required", 400)
        }

        const banner = await prisma.banner.create({
            data: { tag, title, slogan, desc, link, name, image },
            select: {id: true,name: true, tag: true, title: true, slogan: true, desc: true, link: true, image: true}
        })

        return ok(banner, "Banner created", 201)

    }catch(error: unknown){
        console.error(error)
        return fail(getErrorMessage(error))
    }
}