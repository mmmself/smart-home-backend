#!/bin/bash
echo "=== Test smart from inside container ==="
docker exec smart_home_mysql mysql -usmart -psmart123456 -e "SELECT user(), current_user()"

echo "=== Check user plugin ==="
docker exec smart_home_mysql mysql -uroot -proot123456 -e "SELECT user,host,plugin FROM mysql.user WHERE user='smart'"

echo "=== Test smart from host via TCP ==="
mysql -usmart -psmart123456 -h 127.0.0.1 -e "SELECT 1" 2>&1

echo "=== Test with protocol TCP ==="
mysql -usmart -psmart123456 --protocol=TCP -h 127.0.0.1 -e "SELECT 1" 2>&1
