import qrcode

# 1. QR 코드로 인코딩하고 싶은 원본 URL을 여기에 입력하세요.
# 이 URL이 QR 코드를 스캔했을 때 사용자를 이동시키는 최종 목적지입니다.
data_to_encode = "https://teacher-bo.leed.at"

# 2. QR 코드 객체 생성
# version=1: 작은 크기, error_correction=qrcode.constants.ERROR_CORRECT_L: 낮은 오류 복원 레벨
# box_size=10: 각 '점'의 크기, border=4: 테두리 두께
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_L,
    box_size=10,
    border=4,
)

# 3. 데이터 추가 (원본 URL을 그대로 인코딩)
qr.add_data(data_to_encode)
qr.make(fit=True)

# 4. QR 코드 이미지 생성 및 저장
# 파일명은 원하는 대로 변경하세요.
img = qr.make_image(fill_color="black", back_color="white")
file_name = "direct_link_qrcode.png"
img.save(file_name)

print(f"✅ 단축 URL 없이 원본 링크를 담은 QR 코드가 '{file_name}'으로 저장되었습니다.")
print(f"인코딩된 데이터: {data_to_encode}")
