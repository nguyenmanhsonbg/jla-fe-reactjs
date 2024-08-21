import axios from 'axios';
import { useEffect, useState } from 'react';
import CharacterCard from '../CharacterCard';
import { AlphabetResponse } from '@/type';
import { useNavigate } from "react-router-dom";

export default function KatakanaBienAmTable() {
 
  const [dakutenKataList, setDakutenKataList] = useState<[]>([]);
  const navigate = useNavigate();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// const fetchData = useAuthAPI()
useEffect(() => {
  const handleFetchData = async () => {
    try {
      let token =""
      const userEncode = localStorage.getItem("user");
      if (userEncode) {
        const userDecode = JSON.parse(userEncode);
        token = userDecode?.token;
      }
      const request = await axios.get("/alphabet", {
        headers: {
          Authorization: token
        },
        params: {
          type_id: 4
        }
      });
      const response = request.data;
      if (response.statusCode === 200) {
        setDakutenKataList(response.data);
      }
    } catch (error) {
      if (error.response.status === 401) {
        const confirm = window.confirm("Bạn không có quyền truy cập và cần đăng nhập để xem");
        if(confirm) {
          window.location.href = "/";
        }
      }else {
          navigate('/error', { state: { message:error} });
        }
    }
  };
  handleFetchData();
}, []);
  return (
    <div className="flex flex-col gap-5">
      <div className="text-xl font-semibold text-[#7db660] ">BIẾN ÂM</div>
      <div className="w-full h-[1180px] p-8 rounded-2xl">
        <div className="w-full h-[1130px] ">
          <div className="grid grid-cols-5 gap-4">
            {dakutenKataList.map((charData: AlphabetResponse, index) => {
              if (charData.japanese_character.trim() !== "") {
                return (
                  <CharacterCard
                    key={index}
                    character={charData}
                  />
                );
              } else {
                return <div></div>;
              }
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
