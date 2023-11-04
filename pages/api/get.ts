import type { NextApiRequest, NextApiResponse } from 'next'
 
type ResponseData = {
  msg: string
}

/**
 * 该函数用来将网友通过 IPTV 盒子抓包获取的联通单播地址，转成自己的单播地址
 * 该函数每天 3 点触发一次，定时检测网友的单播地址是否有更新，使用 vercel corn 任务进行
 * TODO: 该函数未做鉴权，任何人都可以手动触发检测，为了防止滥用可以加上鉴权，但是 corn 似乎没这个功能
 */
export default function handler(
  request: NextApiRequest,
  response: NextApiResponse<ResponseData>
) {
  // Note: 步骤
  // 1. 获取网友通过监听盒子数据包抓取的（比较费劲，直接用现成的了）联通 IPTV 永久地址（rtp 协议的组播地址，多用户通用），获取其内容
  // 2. 添加本地 udpxy 转发地址
  // 3. 获取之前的 github gist 内容以对比二者
  // 4. 有差异，则更新 github gist 内容
  // 5. 没有，则不做任何操作
  const token = process.env.GITHUB_TOKEN;
  const gist = process.env.GIST_URL;
  const id = process.env.GIST_ID;
  return fetch('https://raw.githubusercontent.com/qwerttvv/Beijing-IPTV/master/IPTV-Unicom.m3u')
    .then(async (res) => {
        if (!res.ok) {
            console.log('获取源地址异常');
            return response.status(200).json({
                msg: '获取源地址异常',
            });
        }
        const src = await res.text();
        // Note: 替换网友的本地单播地址为我的，其实你也可以将自己家的路由器网段设置成跟网友的一样（192.168.123.x），udpxy 端口转发设置成跟网友一样（23234），你就可以直接使用该地址了
        const newGist = src.replace(/http\:\/\/192\.168\.123\.1\:23234/g, "http://192.168.5.2:4022");
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        // Note: 获取 gist 的 raw 内容，需要加个 cache-bust 否则每次请求会被缓存
        return fetch(`${gist}?cache-bust=${Math.floor(Math.random() * 100000)}`, {
            headers: {
                Authorization: `Bearer ${token}`,
              }
        }).then(async (pre) => {
            const preGist = await pre.text();
            // console.log('preGist:', preGist);
            if (JSON.stringify(newGist) !== JSON.stringify(preGist)) {
                // Note: 更新 Gist
                const files = {
                    'IPTV.m3u': {
                        content: newGist,
                    }
                };
                return fetch(`https://api.github.com/gists/${id}`, {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'text/plain'
                    },
                    body: JSON.stringify({ files })
                }).then((s) => {
                    console.log(`更新成功: ${gist}?cache-bust=${Math.floor(Math.random() * 1000000)}`);
                    return response.status(200).json({
                        msg: `更新成功: ${gist}?cache-bust=${Math.floor(Math.random() * 1000000)}`,
                    });
                }).catch(e => {
                    console.log(`更新失败: ${e}`);
                    return response.status(200).json({
                        msg: `更新失败: ${e}`,
                    });
                })
            }
            console.log(`未变化: ${gist}?cache-bust=${Math.floor(Math.random() * 1000000)}`);
            return response.status(200).json({
                msg: `未变化: ${gist}?cache-bust=${Math.floor(Math.random() * 1000000)}`,
            });
        }).catch((e) => {
            console.log(`获取自己的 gist 失败: ${e}`);
            return response.status(200).json({
                msg: `获取自己的 gist 失败: ${e}`,
            });
        });
    }).catch((e) => {
        console.log(`获取别人的源失败: ${e}`);
        return response.status(200).json({
            msg: `获取别人的源失败: ${e}`,
        });
    });;
}