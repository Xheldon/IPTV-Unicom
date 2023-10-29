import type { NextApiRequest, NextApiResponse } from 'next'
 
type ResponseData = {
  msg: string
}
 
export default function handler(
  request: NextApiRequest,
  response: NextApiResponse<ResponseData>
) {
  // Note: 步骤
  // 1. 获取联通 IPTV 永久地址，获取其内容
  // 2. 添加本地 udpxy 转发地址
  // 3. 获取 github gist 内容以对比二者
  // 4. 有差异，则更新 github gist 内容
  // 5. 没有，则不做任何操作
  const token = process.env.GITHUB_TOKEN;
  const gist = process.env.GIST_URL;
  const id = process.env.GIST_ID;
  return fetch('https://raw.githubusercontent.com/qwerttvv/Beijing-IPTV/master/IPTV-Unicom.m3u')
    .then(async (res) => {
        if (!res.ok) {
            return response.status(200).json({
                msg: '获取源地址异常',
            });
        }
        const src = await res.text();
        const newGist = src.replace(/http\:\/\/192\.168\.123\.1\:23234/g, "http://192.168.5.2:4022");
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
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
                    return response.status(200).json({
                        msg: `更新成功: ${gist}?cache-bust=${Math.floor(Math.random() * 1000000)}`,
                    });
                }).catch(e => {
                    return response.status(200).json({
                        msg: `更新失败: ${e}`,
                    });
                })
            }
            return response.status(200).json({
                msg: `未变化: ${gist}?cache-bust=${Math.floor(Math.random() * 1000000)}`,
            });
        }).catch((e) => {
            return response.status(200).json({
                msg: `获取自己的 gist 失败: ${e}`,
            });
        });
    }).catch((e) => {
        return response.status(200).json({
            msg: `获取别人的源失败: ${e}`,
        });
    });;
}