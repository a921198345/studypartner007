import xml.etree.ElementTree as ET

def parse_opml_to_json_tree(opml_string_data: str, subject_name: str) -> dict:
    """
    解析OPML文件内容（字符串），将其转换为特定的JSON树状结构。
    
    参数:
    opml_string_data (str): OPML文件的完整内容。
    subject_name (str): 该OPML文件对应的学科名称。
    
    返回:
    dict: 一个包含解析后数据的字典，准备转换为JSON。
          如果解析失败，可以抛出异常或返回错误指示。
    """
    print(f"开始解析学科 '{subject_name}' 的OPML数据...")
    
    try:
        root = ET.fromstring(opml_string_data)
        body = root.find('body')
        if body is None:
            print(f"警告: 学科 '{subject_name}' 的OPML格式错误：缺少<body>标签")
            return {"error": "OPML格式错误：缺少<body>标签", "subject": subject_name}
        outlines = body.findall('outline')
        if not outlines:
            print(f"警告: 学科 '{subject_name}' 的OPML格式错误：<body>下没有<outline>节点")
            return {"error": "OPML格式错误：<body>下没有<outline>节点", "subject": subject_name}

        # 统一返回带虚拟根节点的结构
        return {
            "name": "root",
            "subject": subject_name,
            "attributes": {},
            "children": [process_outline(node) for node in outlines]
        }
    except ET.ParseError as e:
        print(f"解析学科 '{subject_name}' 的XML失败: {e}")
        return {"error": f"解析XML失败: {str(e)}", "subject": subject_name}
    except Exception as e:
        print(f"解析学科 '{subject_name}' 过程中发生未知错误: {e}")
        return {"error": f"解析过程中发生未知错误: {str(e)}", "subject": subject_name}

def process_outline(node):
    """递归处理每个 <outline> 元素及其子元素"""
    name = node.attrib.get('text', '无名称')
    attributes = {k: v for k, v in node.attrib.items() if k != 'text'}
    children = [process_outline(child) for child in node.findall('outline')]
    return {
        "name": name,
        "attributes": attributes,
        "children": children
    }

if __name__ == "__main__":
    import json
    print("--- 脚本开始执行 ---")
    print("准备读取民法.opml文件...")
    try:
        # 确保 '民法.opml' 和脚本在同一目录下
        with open("民法.opml", "r", encoding="utf-8") as f:
            opml_content = f.read()
        print(f"文件读取成功，内容长度: {len(opml_content)}")
        print("开始解析...")
        result = parse_opml_to_json_tree(opml_content, "民法")
        print("--- 解析完成，结果如下： ---")
        if isinstance(result, dict):
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print(f"解析结果不是预期的字典格式: {result}")
    except FileNotFoundError:
        print("出错啦！民法.opml 文件没有找到。请确保它和脚本在同一个文件夹里。")
    except Exception as e:
        print(f"出错啦！在主程序块发生了错误：{e}")
    print("--- 脚本执行结束 ---")