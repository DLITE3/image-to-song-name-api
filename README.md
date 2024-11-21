# Hono API
This API is created by Hono.

## Development environment
Wrangler + Hono + TypeScript

## Command
develop(loalhost)
```
wrangker dev
```
deploy(cloudflare wokers)
```
wrangler deploy
```

## Image to song names
Sample code. (Python)
API URL -> https://discord.com/channels/1255432145749409863/1255454068650934374/1307170344351563866
```py
import requests
import json
import re

def post_request():
    url = 'https://hogehuga.foo/bar'
    file_path = "./image.jpg"

    # ファイルを開き、POSTリクエストを送信
    with open(file_path, "rb") as file:
        response = requests.post(
            url,
            files={"file": file}
        )

    # レスポンスの内容を表示
    return response

def main():
    data = post_request()
    print(data.status_code)
    print(data.text)

    # JSONの配列部分を正規表現で抽出
    json_string_match = re.findall(r'\[.*?\]', data.text, re.DOTALL)

    if json_string_match:
        # 抽出された文字列の整形
        json_string = json_string_match[0].replace('\\"', '"').replace('\\n', '')

        # JSONをデコードして配列に変換
        song_list = json.loads(json_string)

        # 結果を確認
        print(song_list)
    else:
        print("JSON配列部分が見つかりませんでした。")
    

if __name__ == "__main__":
    main()
```
