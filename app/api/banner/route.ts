import { BannerRequest } from "@/feature/api/banner/type/BannerRequest"
import { getErrorMessage } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { fail, ok } from "@/lib/response"
import { withImageUrl } from "@/lib/withImageUrl"

export async function GET() {
    try{

        const banner = await prisma.banner.findMany({
            select: {id: true,name: true, tag: true, title: true, slogan: true, desc: true, link: true, image: true},
            orderBy: { createAt: "desc" }
        })

        return ok(banner.map(withImageUrl), "Banner retrieved")

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