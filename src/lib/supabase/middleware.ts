import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // getSession() giải mã JWT cục bộ (không gọi mạng) trừ khi token hết hạn cần
  // refresh. Việc xác thực có thẩm quyền (getUser) vẫn chạy ở tầng render/handler
  // qua getCurrentUser(), nên middleware chỉ cần kiểm tra phiên để quyết định redirect.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Giữ lại cookie phiên vừa được refresh khi redirect, nếu không trình duyệt
  // giữ token cũ hết hạn gây lặp redirect / mất phiên khi lưu dữ liệu.
  const redirectTo = (url: typeof request.nextUrl) => {
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return redirect;
  };

  const pathname = request.nextUrl.pathname;
  const isLogin = pathname === "/login";

  if (!session && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") {
      url.searchParams.set("next", pathname);
    }
    return redirectTo(url);
  }

  if (session && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return redirectTo(url);
  }

  return response;
}
