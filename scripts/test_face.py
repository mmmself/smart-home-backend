import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
import json

BASE = "http://localhost:8000"

def test_enroll(person_name: str, image_path: str):
    person_resp = requests.post(f"{BASE}/api/persons", json={"name": person_name, "role": "family"})
    person_data = person_resp.json()
    person_id = person_data["data"]["id"]
    print(f"  创建人员: {person_name} (id={person_id})")

    with open(image_path, "rb") as f:
        resp = requests.post(f"{BASE}/api/face/enroll", params={"person_id": person_id}, files={"file": f})
    data = resp.json()
    if data["code"] == 0:
        print(f"  录入人脸成功: face_id={data['data']['face_id']}")
    else:
        print(f"  录入人脸失败: {data['msg']}")
    return person_id

def test_verify(expect_pass: bool, label: str, image_path: str):
    with open(image_path, "rb") as f:
        resp = requests.post(f"{BASE}/api/face/verify", files={"file": f})
    data = resp.json()
    actual_pass = data["data"]["pass"]
    score = data["data"]["score"]
    status = "PASS" if actual_pass == expect_pass else "FAIL"
    print(f"  [{status}] {label}: expect={'pass' if expect_pass else 'deny'}, actual={'pass' if actual_pass else 'deny'}, score={score:.4f}")
    return actual_pass

if __name__ == "__main__":
    faces_dir = "test_data/faces"
    if not os.path.isdir(faces_dir):
        print(f"请将测试人脸图片放入 {faces_dir}/ 目录")
        print("预期结构: A_1.jpg, A_2.jpg, B_1.jpg, B_2.jpg, C.jpg")
        sys.exit(1)

    print("=== 人脸识别测试 (2真1假) ===\n")

    print("步骤1: 录入人员A的人脸1")
    test_enroll("人员A", os.path.join(faces_dir, "A_1.jpg"))

    print("\n步骤2: 录入人员B的人脸1")
    test_enroll("人员B", os.path.join(faces_dir, "B_1.jpg"))

    print("\n步骤3: 验证A_2 (期望: pass)")
    result1 = test_verify(True, "A_2", os.path.join(faces_dir, "A_2.jpg"))

    print("\n步骤4: 验证B_2 (期望: pass)")
    result2 = test_verify(True, "B_2", os.path.join(faces_dir, "B_2.jpg"))

    print("\n步骤5: 验证陌生人C (期望: deny)")
    result3 = test_verify(False, "陌生人C", os.path.join(faces_dir, "C.jpg"))

    print("\n=== 测试结果 ===")
    passed = [result1, result2, not result3]
    if all(passed):
        print("所有测试通过")
    else:
        print(f"A_2:{'通过' if result1 else '失败'} B_2:{'通过' if result2 else '失败'} C:{'通过' if not result3 else '失败(误识)'}")
